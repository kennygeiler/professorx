/**
 * Twitter API v2 client for fetching liked tweets and bookmarks.
 */

const TWITTER_API_BASE = "https://api.x.com/2";

interface TwitterApiOptions {
  accessToken: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
  entities?: {
    urls?: Array<{ expanded_url: string; display_url: string }>;
  };
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterMediaVariant {
  bit_rate?: number;
  content_type: string;
  url: string;
}

interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  variants?: TwitterMediaVariant[];
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
    tweets?: TwitterTweet[];
  };
  meta?: {
    next_token?: string;
    result_count?: number;
  };
}

const TWEET_FIELDS = "created_at,public_metrics,attachments,referenced_tweets,entities";
const EXPANSIONS = "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id";
const USER_FIELDS = "name,username,profile_image_url";
const MEDIA_FIELDS = "type,url,preview_image_url,width,height,variants";

async function twitterGet(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<TwitterApiResponse> {
  const url = new URL(`${TWITTER_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[Twitter API] ${res.status}: ${errorBody}`);
    if (res.status === 401 || res.status === 403) {
      throw new Error(`TOKEN_EXPIRED: Your Twitter session has expired. Please log out and log back in.`);
    }
    if (res.status === 429) {
      throw new Error(`RATE_LIMITED: Twitter rate limit reached. Please wait a few minutes and try again.`);
    }
    throw new Error(`Twitter API error: ${res.status} - ${errorBody}`);
  }

  return res.json();
}

export async function fetchLikedTweets(
  twitterUserId: string,
  accessToken: string,
  paginationToken?: string
): Promise<{ tweets: NormalizedTweet[]; nextToken?: string }> {
  const params: Record<string, string> = {
    "tweet.fields": TWEET_FIELDS,
    expansions: EXPANSIONS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    max_results: "100",
  };
  if (paginationToken) params.pagination_token = paginationToken;

  const response = await twitterGet(
    `/users/${twitterUserId}/liked_tweets`,
    accessToken,
    params
  );

  return {
    tweets: normalizeTweets(response),
    nextToken: response.meta?.next_token,
  };
}

export async function fetchBookmarks(
  accessToken: string,
  paginationToken?: string
): Promise<{ tweets: NormalizedTweet[]; nextToken?: string }> {
  const params: Record<string, string> = {
    "tweet.fields": TWEET_FIELDS,
    expansions: EXPANSIONS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    max_results: "100",
  };
  if (paginationToken) params.pagination_token = paginationToken;

  const response = await twitterGet(
    `/users/me/bookmarks`,
    accessToken,
    params
  );

  return {
    tweets: normalizeTweets(response),
    nextToken: response.meta?.next_token,
  };
}

export interface NormalizedTweet {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  text_content: string;
  media: Array<{
    type: "photo" | "video" | "animated_gif";
    url: string;
    preview_url?: string;
    video_url?: string;
    width?: number;
    height?: number;
  }>;
  metrics: {
    likes?: number;
    retweets?: number;
    replies?: number;
    quotes?: number;
    views?: number;
  };
  links: Array<{
    url: string;
    display_url: string;
  }>;
  quoted_tweet?: {
    text: string;
    author_handle: string;
    author_display_name: string;
  };
  tweet_type: string;
  tweet_created_at: string | null;
}

function normalizeTweets(response: TwitterApiResponse): NormalizedTweet[] {
  if (!response.data) return [];

  const userMap = new Map<string, TwitterUser>();
  for (const user of response.includes?.users ?? []) {
    userMap.set(user.id, user);
  }

  const mediaMap = new Map<string, TwitterMedia>();
  for (const media of response.includes?.media ?? []) {
    mediaMap.set(media.media_key, media);
  }

  const refTweetMap = new Map<string, TwitterTweet>();
  for (const refTweet of response.includes?.tweets ?? []) {
    refTweetMap.set(refTweet.id, refTweet);
  }

  return response.data.map((tweet) => {
    const author = userMap.get(tweet.author_id ?? "");

    // Resolve media
    const media = (tweet.attachments?.media_keys ?? [])
      .map((key) => mediaMap.get(key))
      .filter((m): m is TwitterMedia => !!m)
      .map((m) => {
        // For videos/gifs, pick the highest-bitrate mp4 variant
        let videoUrl: string | undefined;
        if ((m.type === "video" || m.type === "animated_gif") && m.variants?.length) {
          const mp4s = m.variants
            .filter((v) => v.content_type === "video/mp4")
            .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));
          videoUrl = mp4s[0]?.url;
        }

        return {
          type: m.type,
          url: m.url ?? m.preview_image_url ?? "",
          preview_url: m.preview_image_url,
          video_url: videoUrl,
          width: m.width,
          height: m.height,
        };
      });

    // Determine tweet type and extract quoted tweet
    let tweetType = "tweet";
    let quotedTweet: NormalizedTweet["quoted_tweet"] | undefined;
    if (tweet.referenced_tweets?.length) {
      const ref = tweet.referenced_tweets[0];
      if (ref.type === "retweeted") tweetType = "retweet";
      else if (ref.type === "quoted") {
        tweetType = "quote";
        const qt = refTweetMap.get(ref.id);
        if (qt) {
          const qtAuthor = userMap.get(qt.author_id ?? "");
          quotedTweet = {
            text: qt.text,
            author_handle: qtAuthor?.username ?? "unknown",
            author_display_name: qtAuthor?.name ?? "unknown",
          };
        }
      }
      else if (ref.type === "replied_to") tweetType = "reply";
    }

    return {
      twitter_tweet_id: tweet.id,
      author_handle: author?.username ?? "unknown",
      author_display_name: author?.name ?? "unknown",
      author_avatar_url: author?.profile_image_url ?? null,
      text_content: tweet.text,
      media,
      links: (tweet.entities?.urls ?? [])
        .filter((u) => !u.display_url.startsWith("pic.twitter.com"))
        .map((u) => ({ url: u.expanded_url, display_url: u.display_url })),
      metrics: {
        likes: tweet.public_metrics?.like_count,
        retweets: tweet.public_metrics?.retweet_count,
        replies: tweet.public_metrics?.reply_count,
        quotes: tweet.public_metrics?.quote_count,
        views: tweet.public_metrics?.impression_count,
      },
      quoted_tweet: quotedTweet,
      tweet_type: tweetType,
      tweet_created_at: tweet.created_at ?? null,
    };
  });
}

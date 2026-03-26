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

interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
  };
  meta?: {
    next_token?: string;
    result_count?: number;
  };
}

const TWEET_FIELDS = "created_at,public_metrics,attachments,referenced_tweets,entities";
const EXPANSIONS = "author_id,attachments.media_keys";
const USER_FIELDS = "name,username,profile_image_url";
const MEDIA_FIELDS = "type,url,preview_image_url,width,height";

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

  return response.data.map((tweet) => {
    const author = userMap.get(tweet.author_id ?? "");

    // Resolve media
    const media = (tweet.attachments?.media_keys ?? [])
      .map((key) => mediaMap.get(key))
      .filter((m): m is TwitterMedia => !!m)
      .map((m) => ({
        type: m.type,
        url: m.url ?? m.preview_image_url ?? "",
        preview_url: m.preview_image_url,
        width: m.width,
        height: m.height,
      }));

    // Determine tweet type
    let tweetType = "tweet";
    if (tweet.referenced_tweets?.length) {
      const ref = tweet.referenced_tweets[0];
      if (ref.type === "retweeted") tweetType = "retweet";
      else if (ref.type === "quoted") tweetType = "quote";
      else if (ref.type === "replied_to") tweetType = "reply";
    }

    return {
      twitter_tweet_id: tweet.id,
      author_handle: author?.username ?? "unknown",
      author_display_name: author?.name ?? "unknown",
      author_avatar_url: author?.profile_image_url ?? null,
      text_content: tweet.text,
      media,
      metrics: {
        likes: tweet.public_metrics?.like_count,
        retweets: tweet.public_metrics?.retweet_count,
        replies: tweet.public_metrics?.reply_count,
        quotes: tweet.public_metrics?.quote_count,
        views: tweet.public_metrics?.impression_count,
      },
      tweet_type: tweetType,
      tweet_created_at: tweet.created_at ?? null,
    };
  });
}

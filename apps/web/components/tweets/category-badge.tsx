"use client";

import { useState } from "react";
import { ReclassifyModal } from "./reclassify-modal";

interface CategoryBadgeProps {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  tweetId: string;
  originalCategoryName: string;
}

export function CategoryBadge({
  categoryId,
  categoryName,
  categoryColor,
  tweetId,
  originalCategoryName,
}: CategoryBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          backgroundColor: `${categoryColor}20`,
          color: categoryColor,
          border: `1px solid ${categoryColor}40`,
        }}
      >
        {categoryName}
      </button>

      {showModal && (
        <ReclassifyModal
          tweetId={tweetId}
          currentCategoryId={categoryId}
          currentCategoryName={originalCategoryName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

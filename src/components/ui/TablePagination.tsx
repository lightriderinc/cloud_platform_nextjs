"use client";

import LRButton from "@/components/ui/LRButton";
import { MdArrowBack, MdArrowForward } from "react-icons/md";

/**
 * Table footer: "11–20 of 34 transfers" on the left, and back/forward buttons
 * around "2 / 4" on the right. Pages are 1-based. Hidden when everything fits
 * on one page.
 */
export default function TablePagination({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Plural noun for the rows, e.g. "transfers". */
  itemLabel: string;
  onPageChange: (page: number) => void;
  /** Disables both buttons, e.g. while the next page is being fetched. */
  disabled?: boolean;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span>
        {start}–{end} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-3">
        <LRButton
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || disabled}
          variant="secondary-outline"
          aria-label="Previous page"
        >
          <MdArrowBack />
        </LRButton>
        <span>
          {page} / {totalPages}
        </span>
        <LRButton
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || disabled}
          variant="secondary-outline"
          aria-label="Next page"
        >
          <MdArrowForward />
        </LRButton>
      </div>
    </div>
  );
}

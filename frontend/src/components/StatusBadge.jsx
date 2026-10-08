import React from 'react';

/** Status pill used across posts and campaigns. */
export default function StatusBadge({ value }) {
  return <span className={`badge ${value}`}>{value}</span>;
}

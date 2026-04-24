import type { FC } from "react";
import styles from "./TreeChartNodeKit.module.css";

/** Visual 20% / 60% / 20% zones aligned with `detectDropIntent` while dragging. */
export const TreeChartDropZoneOverlay: FC = () => (
  <div className={styles.hitboxOverlay} aria-hidden>
    <div className={styles.hitboxBefore}>
      <span className={styles.hitboxLabel}>before</span>
    </div>
    <div className={styles.hitboxChild}>
      <span className={styles.hitboxLabel}>child</span>
    </div>
    <div className={styles.hitboxAfter}>
      <span className={styles.hitboxLabel}>after</span>
    </div>
  </div>
);

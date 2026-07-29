import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { toArabicDigits } from '../lib/format';

export default function CountUp({
  to,
  duration = 1.2,
  arabic = true,
}: {
  to: number;
  duration?: number;
  arabic?: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    arabic ? toArabicDigits(Math.round(v)) : Math.round(v).toString(),
  );

  useEffect(() => {
    const controls = animate(count, to, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [to, duration, count]);

  return <motion.span>{rounded}</motion.span>;
}

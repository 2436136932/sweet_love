import { motion, useMotionValue, useTransform } from 'motion/react';
import { Key, ReactNode, useEffect, useMemo, useState } from 'react';
import './Stack.css';

type AnimationConfig = {
  stiffness: number;
  damping: number;
};

type StackCard = {
  id: number;
  content: ReactNode;
  rotation: number;
};

function CardRotate({
  children,
  onSendToBack,
  sensitivity,
  disableDrag = false,
}: {
  key?: Key;
  children: ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
  disableDrag?: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack();
      return;
    }

    x.set(0);
    y.set(0);
  }

  if (disableDrag) {
    return (
      <motion.div className="stack-card-rotate-disabled" style={{ x: 0, y: 0 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="stack-card-rotate"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

export default function Stack({
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  mobileClickOnly = false,
  mobileBreakpoint = 768,
  mobileSensitivity = 80,
}: {
  randomRotation?: boolean;
  sensitivity?: number;
  cards?: ReactNode[];
  animationConfig?: AnimationConfig;
  sendToBackOnClick?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  mobileClickOnly?: boolean;
  mobileBreakpoint?: number;
  mobileSensitivity?: number;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const preparedCards = useMemo<StackCard[]>(
    () =>
      cards.map((content, index) => ({
        id: index + 1,
        content,
        rotation: randomRotation ? Math.random() * 10 - 5 : 0,
      })),
    [cards, randomRotation],
  );
  const [stack, setStack] = useState<StackCard[]>(preparedCards);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
      setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [mobileBreakpoint]);

  useEffect(() => {
    setStack(preparedCards);
  }, [preparedCards]);

  const sendToBack = (id: number) => {
    setStack((prev) => {
      const next = [...prev];
      const index = next.findIndex((card) => card.id === id);
      if (index < 0) return prev;
      const [card] = next.splice(index, 1);
      next.unshift(card);
      return next;
    });
  };

  useEffect(() => {
    if (!autoplay || stack.length <= 1 || isPaused) return;

    const interval = window.setInterval(() => {
      const topCardId = stack[stack.length - 1].id;
      sendToBack(topCardId);
    }, autoplayDelay);

    return () => window.clearInterval(interval);
  }, [autoplay, autoplayDelay, stack, isPaused]);

  const shouldDisableDrag = mobileClickOnly && isMobile;
  const shouldEnableClick = sendToBackOnClick || shouldDisableDrag;
  const effectiveSensitivity = isMobile ? mobileSensitivity : sensitivity;

  return (
    <div
      className="stack-container"
      onMouseEnter={() => pauseOnHover && canHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && canHover && setIsPaused(false)}
    >
      {stack.map((card, index) => (
        <CardRotate
          key={card.id}
          onSendToBack={() => sendToBack(card.id)}
          sensitivity={effectiveSensitivity}
          disableDrag={shouldDisableDrag}
        >
          <motion.div
            className="stack-card"
            onClick={() => shouldEnableClick && sendToBack(card.id)}
            animate={{
              rotateZ: (stack.length - index - 1) * 4 + card.rotation,
              scale: 1 + index * 0.06 - stack.length * 0.06,
              transformOrigin: '90% 90%',
            }}
            initial={false}
            transition={{
              type: 'spring',
              stiffness: animationConfig.stiffness,
              damping: animationConfig.damping,
            }}
          >
            {card.content}
          </motion.div>
        </CardRotate>
      ))}
    </div>
  );
}

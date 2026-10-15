import { lazy, Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomCursor from './components/UI/CustomCursor';
import LightspeedTransition from './components/UI/LightspeedTransition';
import Intro from './components/Intro/Intro';
import { useRoute, navigate } from './utils/route';
import { playWarp, stopBackground } from './utils/sounds';

// The galaxy is the heavy chunk (three + every shader). Keeping the import in
// a function lets the intro warm it during idle time and the warp start it
// eagerly, so /space is usually ready by the time the flash clears.
const loadSpace = () => import('./App');
const Space  = lazy(loadSpace);
const Resume = lazy(() => import('./components/Pages/Resume'));

const ROUTES = {
  '/':             'Taylor Cornelius — Lead Product Designer',
  '/resume':       'Resume — Taylor Cornelius',
  '/banana-phone': 'Banana Phone — Taylor Cornelius',
  '/space':        'Explore — Taylor Cornelius',
};

export default function Root() {
  const path = useRoute();
  const [warping, setWarping] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!(path in ROUTES)) navigate('/', { replace: true });
    else document.title = ROUTES[path];
  }, [path]);

  function startWarp() {
    if (warping) return;
    loadSpace();
    playWarp();
    setWarping(true);
  }

  function finishWarp() {
    setFlash(true);
    navigate('/space');
    setWarping(false);
  }

  function backToMenu() {
    stopBackground();
    navigate('/');
  }

  let page;
  if (path === '/space') page = <Space onMenu={backToMenu} />;
  else if (path === '/resume') page = <Resume onExplore={startWarp} />;
  else page = <Intro path={path} onExplore={startWarp} preloadSpace={loadSpace} />;

  return (
    <>
      <CustomCursor />
      <Suspense fallback={<div className="route-fallback" />}>{page}</Suspense>
      {warping && <LightspeedTransition onComplete={finishWarp} />}
      {/* LightspeedTransition ends on a near-white frame; fade it off over the
          galaxy instead of cutting straight to black. */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="warp-flash"
            initial={{ opacity: 0.97 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => setFlash(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

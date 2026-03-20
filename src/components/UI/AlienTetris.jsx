import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import './AlienTetris.css';

const COLS = 10;
const ROWS = 20;
const WIN_SCORE = 800;

const PIECES = {
  I: { cells: [[0,0],[0,1],[0,2],[0,3]], color: '#00ffff', glyph: 'ᚠ' },
  O: { cells: [[0,0],[0,1],[1,0],[1,1]], color: '#ffd700', glyph: 'ᛒ' },
  T: { cells: [[0,1],[1,0],[1,1],[1,2]], color: '#cc44ff', glyph: 'ᚢ' },
  S: { cells: [[0,1],[0,2],[1,0],[1,1]], color: '#00ff6a', glyph: 'ᛖ' },
  Z: { cells: [[0,0],[0,1],[1,1],[1,2]], color: '#ff4444', glyph: 'ᛗ' },
  J: { cells: [[0,0],[1,0],[1,1],[1,2]], color: '#4488ff', glyph: 'ᚾ' },
  L: { cells: [[0,2],[1,0],[1,1],[1,2]], color: '#ff8844', glyph: 'ᛏ' },
};
const PIECE_TYPES = Object.keys(PIECES);
const SCORE_TABLE = [0, 40, 100, 300, 1200];
const RUNE_CHARS = ['ᚠ', 'ᛒ', 'ᚢ', 'ᛖ', 'ᛗ', 'ᚾ', 'ᛏ'];

function randomType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function rotateCW(cells) {
  const maxR = Math.max(...cells.map(c => c[0]));
  return cells.map(([r, c]) => [c, maxR - r]);
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}

function isValid(board, cells, ox, oy) {
  return cells.every(([r, c]) => {
    const nr = r + oy, nc = c + ox;
    return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !board[nr][nc];
  });
}

function lockPiece(board, cells, ox, oy, pieceType) {
  const next = board.map(row => [...row]);
  cells.forEach(([r, c]) => {
    const nr = r + oy, nc = c + ox;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      next[nr][nc] = pieceType;
    }
  });
  return next;
}

function clearLines(board) {
  const remaining = board.filter(row => row.some(cell => !cell));
  const cleared = ROWS - remaining.length;
  const newBoard = [
    ...Array.from({ length: cleared }, () => new Array(COLS).fill(null)),
    ...remaining,
  ];
  return { board: newBoard, linesCleared: cleared };
}

function ghostY(board, cells, ox, oy) {
  let y = oy;
  while (isValid(board, cells, ox, y + 1)) y++;
  return y;
}

function spawnPiece(type) {
  const cells = PIECES[type].cells;
  const minC = Math.min(...cells.map(c => c[1]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const ox = Math.floor((COLS - (maxC - minC + 1)) / 2) - minC;
  return { type, cells, x: ox, y: 0 };
}

function NextPiecePreview({ type }) {
  if (!type) return null;
  const { cells, color, glyph } = PIECES[type];
  const maxR = Math.max(...cells.map(c => c[0]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const grid = Array.from({ length: maxR + 1 }, () => new Array(maxC + 1).fill(false));
  cells.forEach(([r, c]) => { grid[r][c] = true; });
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {row.map((filled, ci) => (
            <div key={ci} style={{
              width: 18, height: 18,
              background: filled ? color : 'rgba(0,0,0,0.3)',
              border: filled ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,255,106,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: 'rgba(255,255,255,0.4)',
            }}>
              {filled ? glyph : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WinParticles() {
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2;
      const dist  = 80 + Math.random() * 120;
      return {
        px: `${Math.cos(angle) * dist}px`,
        py: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 400}ms`,
        char: RUNE_CHARS[i % RUNE_CHARS.length],
      };
    })
  );
  return (
    <>
      {particles.current.map((p, i) => (
        <span key={i} className="win-particle"
          style={{ '--px': p.px, '--py': p.py, '--pdelay': p.delay }}>
          {p.char}
        </span>
      ))}
    </>
  );
}

export default function AlienTetris({ onClose, onWin, tetrisActiveRef }) {
  const [board,      setBoard]      = useState(emptyBoard);
  const [current,    setCurrent]    = useState(() => spawnPiece(randomType()));
  const [nextType,   setNextType]   = useState(randomType);
  const [score,      setScore]      = useState(0);
  const [lines,      setLines]      = useState(0);
  const [level,      setLevel]      = useState(1);
  const [gameState,  setGameState]  = useState('playing');
  const [clearing,   setClearing]   = useState([]);
  const [winPhase,   setWinPhase]   = useState(0);

  const wonFiredRef       = useRef(false);
  const tickRef           = useRef(null);
  const clearingTimerRef  = useRef(null);
  const lockingRef        = useRef(false);

  // Signal active to parent so camera ignores arrow keys
  useEffect(() => {
    if (tetrisActiveRef) tetrisActiveRef.current = true;
    return () => { if (tetrisActiveRef) tetrisActiveRef.current = false; };
  }, [tetrisActiveRef]);

  // Cancel clearing timer on unmount
  useEffect(() => {
    return () => {
      if (clearingTimerRef.current) clearTimeout(clearingTimerRef.current);
    };
  }, []);

  // Keep tickRef up-to-date so the interval closure is always fresh
  useEffect(() => {
    tickRef.current = { board, current, score, lines, level, nextType };
  });

  // Lock piece onto board and advance game state
  const lockAndAdvance = useCallback((boardSnap, piece, snapScore, snapLines, snapLevel, snapNextType) => {
    if (lockingRef.current) return;
    lockingRef.current = true;

    const locked = lockPiece(boardSnap, piece.cells, piece.x, piece.y, piece.type);

    const clearedRows = [];
    locked.forEach((row, ri) => { if (row.every(c => c)) clearedRows.push(ri); });

    const { board: clearedBoard, linesCleared } = clearLines(locked);

    if (linesCleared > 0) {
      setClearing(clearedRows);
      if (clearingTimerRef.current) clearTimeout(clearingTimerRef.current);
      clearingTimerRef.current = setTimeout(() => setClearing([]), 300);
    }

    const addScore  = SCORE_TABLE[linesCleared] * snapLevel;
    const newScore  = snapScore + addScore;
    const newLines  = snapLines + linesCleared;
    const newLevel  = 1 + Math.floor(newLines / 10);

    setBoard(clearedBoard);
    setScore(newScore);
    setLines(newLines);
    setLevel(newLevel);

    if (newScore >= WIN_SCORE) {
      setGameState('won');
      lockingRef.current = false;
      return;
    }

    const np = spawnPiece(snapNextType);
    if (!isValid(clearedBoard, np.cells, np.x, np.y)) {
      setGameState('lost');
    } else {
      setCurrent(np);
      setNextType(randomType());
    }
    lockingRef.current = false;
  }, []);

  // Drop tick
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = Math.max(100, 800 - (level - 1) * 70);
    const id = setInterval(() => {
      const snap = tickRef.current;
      if (!snap) return;
      const { board: b, current: c, score: s, lines: l, level: lv, nextType: nt } = snap;
      if (isValid(b, c.cells, c.x, c.y + 1)) {
        setCurrent(prev => ({ ...prev, y: prev.y + 1 }));
      } else {
        lockAndAdvance(b, c, s, l, lv, nt);
      }
    }, interval);
    return () => clearInterval(id);
  }, [gameState, level, lockAndAdvance]);

  // Win sequence
  useEffect(() => {
    if (gameState !== 'won' || wonFiredRef.current) return;
    wonFiredRef.current = true;
    setWinPhase(1);
    const t2 = setTimeout(() => setWinPhase(2), 200);
    const t3 = setTimeout(() => setWinPhase(3), 800);
    const t4 = setTimeout(() => setWinPhase(4), 1500);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handler = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        return;
      }
      const snap = tickRef.current;
      if (!snap) return;
      const { board: b, current: c, score: s, lines: l, level: lv, nextType: nt } = snap;

      if (e.code === 'ArrowLeft') {
        if (isValid(b, c.cells, c.x - 1, c.y)) setCurrent(prev => ({ ...prev, x: prev.x - 1 }));
      } else if (e.code === 'ArrowRight') {
        if (isValid(b, c.cells, c.x + 1, c.y)) setCurrent(prev => ({ ...prev, x: prev.x + 1 }));
      } else if (e.code === 'ArrowDown') {
        if (isValid(b, c.cells, c.x, c.y + 1)) {
          setCurrent(prev => ({ ...prev, y: prev.y + 1 }));
        } else {
          lockAndAdvance(b, c, s, l, lv, nt);
        }
      } else if (e.code === 'ArrowUp' || e.code === 'Space') {
        const rotated = rotateCW(c.cells);
        if      (isValid(b, rotated, c.x,     c.y)) setCurrent(prev => ({ ...prev, cells: rotated }));
        else if (isValid(b, rotated, c.x + 1, c.y)) setCurrent(prev => ({ ...prev, cells: rotated, x: prev.x + 1 }));
        else if (isValid(b, rotated, c.x - 1, c.y)) setCurrent(prev => ({ ...prev, cells: rotated, x: prev.x - 1 }));
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [gameState, lockAndAdvance]);

  // ESC to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); if (gameState === 'won') onWin?.(); onClose(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [onClose, onWin, gameState]);

  const reset = useCallback(() => {
    const t = randomType();
    setBoard(emptyBoard());
    setCurrent(spawnPiece(t));
    setNextType(randomType());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameState('playing');
    setClearing([]);
    setWinPhase(0);
    wonFiredRef.current = false;
  }, []);

  // Build render board: locked cells + ghost + current piece
  const renderBoard = (() => {
    const rb = board.map(row => row.map(cell => cell ? { type: cell, ghost: false } : null));
    if (gameState === 'playing' && current) {
      const gy = ghostY(board, current.cells, current.x, current.y);
      // Draw ghost first (underneath)
      current.cells.forEach(([r, c]) => {
        const gr = r + gy, gc = c + current.x;
        if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS && !rb[gr][gc]) {
          rb[gr][gc] = { type: current.type, ghost: true };
        }
      });
      // Draw active piece on top
      current.cells.forEach(([r, c]) => {
        const nr = r + current.y, nc = c + current.x;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          rb[nr][nc] = { type: current.type, ghost: false };
        }
      });
    }
    return rb;
  })();

  const pct = Math.min(100, (score / WIN_SCORE) * 100);

  return createPortal(
    <div className="alien-tetris-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="alien-tetris-container"
        style={{ paddingTop: 52 }}
      >
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div className="tetris-header" style={{ padding: '12px 16px 0' }}>
            <span className="tetris-title">◈ SIGNAL INTERCEPT ◈</span>
            <button className="tetris-close-btn" onClick={onClose}>ESC TO ABORT</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Sidebar */}
          <div className="tetris-sidebar">
            <div>
              <div className="tetris-sidebar-label">INCOMING</div>
              <div className="tetris-next-box">
                <NextPiecePreview type={nextType} />
              </div>
            </div>
            <div className="tetris-stat">
              <div>SIGNAL</div>
              <div className="tetris-stat-value">{score}</div>
              <div className="signal-bar-track">
                <div className="signal-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ marginTop: 2, fontSize: 8, opacity: 0.5 }}>TARGET: {WIN_SCORE}</div>
            </div>
            <div className="tetris-stat">
              <div>LINES</div>
              <div className="tetris-stat-value">{lines}</div>
            </div>
            <div className="tetris-stat">
              <div>LEVEL</div>
              <div className="tetris-stat-value">{level}</div>
            </div>
          </div>

          {/* Board */}
          <div className="tetris-board-wrap">
            <div
              className={`tetris-board${winPhase >= 1 ? ' win-glow' : ''}`}
              style={{ position: 'relative' }}
            >
              {renderBoard.map((row, ri) =>
                row.map((cell, ci) => {
                  const isClearing = clearing.includes(ri);
                  const color = cell ? PIECES[cell.type]?.color : null;
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={[
                        'tetris-cell',
                        cell ? (cell.ghost ? 'ghost' : 'filled') : 'empty',
                        isClearing ? 'clearing' : '',
                        winPhase >= 2 ? 'cascade' : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        background: cell && !cell.ghost ? color : undefined,
                        color: color,
                        '--cascade-delay': winPhase >= 2 ? (ri * 18 + ci * 5) : 0,
                        borderColor: cell && !cell.ghost ? `${color}44` : undefined,
                      }}
                    >
                      {cell && !cell.ghost && (
                        <span className="cell-glyph">{PIECES[cell.type].glyph}</span>
                      )}
                    </div>
                  );
                })
              )}

              {/* Win overlay */}
              {winPhase >= 3 && <div className="win-signal-text">SIGNAL ACQUIRED</div>}
              {winPhase >= 4 && <WinParticles />}
              {winPhase >= 4 && (
                <button
                  className="tetris-close-channel"
                  onClick={() => { onWin?.(); onClose(); }}
                >
                  CLOSE CHANNEL
                </button>
              )}

              {/* Game over overlay */}
              {gameState === 'lost' && (
                <div className="tetris-gameover-overlay">
                  <div className="tetris-gameover-title">SIGNAL LOST</div>
                  <div className="tetris-gameover-sub">TRANSMISSION CORRUPTED</div>
                  <div className="tetris-btn-row">
                    <button className="tetris-btn" onClick={reset}>RETRY</button>
                    <button className="tetris-btn" onClick={onClose}>ABORT</button>
                  </div>
                </div>
              )}
            </div>
            <div className="tetris-controls">
              ← → MOVE &nbsp;|&nbsp; ↑ / SPC ROTATE &nbsp;|&nbsp; ↓ SOFT DROP
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

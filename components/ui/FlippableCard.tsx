// PATH: app/components/ui/FlippableCard.tsx
"use client";

import { useState } from 'react';
import { Box } from '@mantine/core';
import { ReactNode } from 'react';
import classes from './FlippableCard.module.css';

interface FlippableCardProps {
  /** Content for the front of the card */
  front: ReactNode;
  /** Content for the back of the card */
  back: ReactNode;
}

export function FlippableCard({ front, back }: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // This is the trigger you mentioned.
  // The state change causes a re-render.
  const handleClick = () => {
    setIsFlipped((f) => !f);
  };

  return (
    // The .scene div sets up the 3D space
    <Box className={classes.scene} onClick={handleClick}>
      {/* The .card div is what rotates.
        We apply the rotation inline based on the `isFlipped` state.
      */}
      <Box
        className={classes.card}
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* The Front */}
        <Box className={`${classes.cardFace} ${classes.cardFaceFront}`}>
          {front}
        </Box>
        
        {/* The Back */}
        <Box className={`${classes.cardFace} ${classes.cardFaceBack}`}>
          {back}
        </Box>
      </Box>
    </Box>
  );
}
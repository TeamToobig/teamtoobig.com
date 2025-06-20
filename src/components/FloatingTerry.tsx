import React, { useRef, useEffect, useState, useCallback } from 'react';

interface TerryState {
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  correctionDirectionX: number; // Direction to accelerate when beyond threshold
  correctionDirectionY: number;
  correctionAngularAcceleration: number; // Angular acceleration direction during correction
  isBeingCorrected: boolean; // Whether we're currently applying correction acceleration
}

const Terry: React.FC = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Track Terry's size for responsive calculations
  const [terrySize, setTerrySize] = useState({ width: 0, height: 0 });

  // State for Terry's position and physics
  const [terryState, setTerryState] = useState<TerryState>({
    x: 0,
    y: 0,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
    correctionDirectionX: 0,
    correctionDirectionY: 0,
    correctionAngularAcceleration: 0,
    isBeingCorrected: false,
  });

  
  const PHYSICS_CONFIG = {
    DISTANCE_THRESHOLD_MULTIPLIER: 0.000001, // Distance threshold as multiple of Terry's size
    INITIAL_VELOCITY_MIN: 0.4, // Minimum magnitude for initial velocity (reduced)
    INITIAL_VELOCITY_MAX: 0.4, // Maximum magnitude for initial velocity (reduced)
    
    CORRECTION_ACCELERATION: 0.001, // Acceleration when beyond threshold (reduced)
    MIN_VELOCITY_TO_STOP_CORRECTION: 0.4, // Stop correction when velocity exceeds this (reduced)
    CORRECTION_ANGLE_RANGE: Math.PI / 4, // 30 degrees in radians (reduced from 45)

    MAX_ACCEPTABLE_VELOCITY: 0.4, // Maximum velocity before deceleration kicks in (reduced)
    DECELERATION_FORCE: 0.05, // Deceleration applied when over max velocity (increased)

    // Angular velocity physics (matching linear velocity approach)
    MAX_ACCEPTABLE_ANGULAR_VELOCITY: 0.03, // Maximum angular velocity before deceleration kicks in
    ANGULAR_DECELERATION_FORCE: 0.0001, // Deceleration applied when over max angular velocity
    
    CORRECTION_ANGULAR_ACCELERATION_MIN: 0.01, // Minimum angular acceleration during correction
    CORRECTION_ANGULAR_ACCELERATION_MAX: 0.01, // Maximum angular acceleration during correction

    CLICK_IMPULSE_BASE: 5,
    CLICK_ANGULAR_BASE: 0.5,
  };

  // Track Terry's size for physics calculations
  useEffect(() => {
    const updateTerrySize = () => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        setTerrySize({ width: rect.width, height: rect.height });
      }
    };

    updateTerrySize();
    window.addEventListener('resize', updateTerrySize);
    return () => window.removeEventListener('resize', updateTerrySize);
  }, []);

  // Calculate distance threshold based on Terry's actual size
  const getDistanceThreshold = useCallback(() => {
    // Use the larger dimension of Terry as the reference
    const referenceDimension = Math.max(terrySize.width, terrySize.height);
    return referenceDimension * PHYSICS_CONFIG.DISTANCE_THRESHOLD_MULTIPLIER;
  }, [terrySize]);

  // Update Terry's size when image loads
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      setTerrySize({ width: rect.width, height: rect.height });
    }
  }, []);

  // Initialize Terry at center on mount
  useEffect(() => {
    // Generate random initial velocity with minimum magnitude
    const angle = Math.random() * 2 * Math.PI; // Random direction
    const magnitude = PHYSICS_CONFIG.INITIAL_VELOCITY_MIN + 
                     Math.random() * (PHYSICS_CONFIG.INITIAL_VELOCITY_MAX - PHYSICS_CONFIG.INITIAL_VELOCITY_MIN);
    
    setTerryState(prevState => ({
      ...prevState,
      x: 0,
      y: 0,
      velocityX: Math.cos(angle) * magnitude,
      velocityY: Math.sin(angle) * magnitude,
      angularVelocity: (Math.random() - 0.5) * 0.2,
      correctionDirectionX: 0,
      correctionDirectionY: 0,
      correctionAngularAcceleration: 0,
      isBeingCorrected: false,
    }));
  }, []);

  // Physics update function
  const updatePhysics = useCallback((deltaTime: number) => {
    setTerryState(prevState => {
      const newState = { ...prevState };

      // NO angular damping - zero angular drag as requested
      
      // Calculate distance from center
      const distanceFromCenter = Math.sqrt(newState.x * newState.x + newState.y * newState.y);
      const distanceThreshold = getDistanceThreshold();
      
      // Current velocity magnitude
      const currentVelocityMagnitude = Math.sqrt(newState.velocityX * newState.velocityX + newState.velocityY * newState.velocityY);
      
      // Current angular velocity magnitude
      const currentAngularVelocityMagnitude = Math.abs(newState.angularVelocity);
      
      // Check if we need to start correction (step 2)
      if (distanceFromCenter > distanceThreshold && !newState.isBeingCorrected) {
        // Calculate direction straight back to center
        if (distanceFromCenter > 0) {
          const toCenterX = -newState.x / distanceFromCenter;
          const toCenterY = -newState.y / distanceFromCenter;
          
          // Pick a direction within 45 degrees of center direction
          const centerAngle = Math.atan2(toCenterY, toCenterX);
          const randomOffset = (Math.random() - 0.5) * 2 * PHYSICS_CONFIG.CORRECTION_ANGLE_RANGE;
          const correctionAngle = centerAngle + randomOffset;
          
          newState.correctionDirectionX = Math.cos(correctionAngle);
          newState.correctionDirectionY = Math.sin(correctionAngle);
          
          // Pick random angular acceleration direction and amount
          // 90% of the time, keep rotation in the same direction as current angular velocity
          const angularAccelerationMagnitude = PHYSICS_CONFIG.CORRECTION_ANGULAR_ACCELERATION_MIN + 
            Math.random() * (PHYSICS_CONFIG.CORRECTION_ANGULAR_ACCELERATION_MAX - PHYSICS_CONFIG.CORRECTION_ANGULAR_ACCELERATION_MIN);
          
          let angularDirection: number;
          if (Math.abs(newState.angularVelocity) < 0.001) {
            // If barely rotating, pick random direction
            angularDirection = Math.random() < 0.5 ? -1 : 1;
          } else if (Math.random() < 0.9) {
            // 90% of the time: keep same direction as current rotation
            angularDirection = newState.angularVelocity >= 0 ? 1 : -1;
          } else {
            // 10% of the time: try to rotate the other way
            angularDirection = newState.angularVelocity >= 0 ? -1 : 1;
          }
          
          newState.correctionAngularAcceleration = angularDirection * angularAccelerationMagnitude;
          
          newState.isBeingCorrected = true;
        }
      }
      
      // Apply correction acceleration (step 3)
      if (newState.isBeingCorrected && distanceFromCenter > distanceThreshold) {
        const acceleration = PHYSICS_CONFIG.CORRECTION_ACCELERATION * (deltaTime / 16);
        newState.velocityX += newState.correctionDirectionX * acceleration;
        newState.velocityY += newState.correctionDirectionY * acceleration;
        
        // Apply angular correction acceleration
        const angularAcceleration = newState.correctionAngularAcceleration * (deltaTime / 16);
        newState.angularVelocity += angularAcceleration;
      }
      
      // Stop correction if conditions are met (step 4)
      // Also add emergency stop if Terry gets too far away
      if (newState.isBeingCorrected && 
          ((distanceFromCenter <= distanceThreshold && 
            currentVelocityMagnitude >= PHYSICS_CONFIG.MIN_VELOCITY_TO_STOP_CORRECTION) ||
           distanceFromCenter > distanceThreshold * 5)) { // Emergency stop if too far
        newState.isBeingCorrected = false;
        newState.correctionAngularAcceleration = 0; // Reset angular acceleration
      }
      
      // Apply velocity limiting (deceleration when too fast)
      if (currentVelocityMagnitude > PHYSICS_CONFIG.MAX_ACCEPTABLE_VELOCITY) {
        const decelerationForce = PHYSICS_CONFIG.DECELERATION_FORCE * (deltaTime / 16);
        
        // Apply deceleration proportionally to each velocity component
        const scale = 1 - (decelerationForce / currentVelocityMagnitude);
        newState.velocityX *= Math.max(0, scale);
        newState.velocityY *= Math.max(0, scale);
      }
      
      // Apply angular velocity limiting (deceleration when spinning too fast)
      if (currentAngularVelocityMagnitude > PHYSICS_CONFIG.MAX_ACCEPTABLE_ANGULAR_VELOCITY) {
        const angularDecelerationForce = PHYSICS_CONFIG.ANGULAR_DECELERATION_FORCE * (deltaTime / 16);
        
        // Apply deceleration while preserving direction
        const direction = newState.angularVelocity >= 0 ? 1 : -1;
        const newMagnitude = Math.max(0, currentAngularVelocityMagnitude - angularDecelerationForce);
        newState.angularVelocity = direction * newMagnitude;
      }
      
      // Update position based on velocity
      newState.x += newState.velocityX * (deltaTime / 16);
      newState.y += newState.velocityY * (deltaTime / 16);
      
      // Update rotation based on angular velocity
      newState.rotation += newState.angularVelocity * (deltaTime / 16);
      
      // Keep rotation in reasonable bounds
      newState.rotation = newState.rotation % 360;

      return newState;
    });
  }, [getDistanceThreshold]);

  // Animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const deltaTime = currentTime - lastTimeRef.current;
        updatePhysics(deltaTime);
      }
      lastTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updatePhysics]);

  // Handle clicks on Terry
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!imgRef.current || !containerRef.current) return;

    // Get click position relative to Terry's center
    const rect = imgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = event.clientX - centerX;
    const clickY = event.clientY - centerY;

    // TODO: Calculate impulse based on click position
    // TODO: Add randomization to the impulse
    // TODO: Apply linear momentum based on click direction
    // TODO: Apply angular momentum based on click position relative to center
    
    setTerryState(prevState => ({
      ...prevState,
      // TODO: Update velocities based on click impulse
    }));
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        ref={imgRef}
        src="/img/terry.webp"
        alt="Terry"
        onClick={handleClick}
        onLoad={handleImageLoad}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '80vh',
          maxHeight: '80vh',
          userSelect: 'none',
          position: 'absolute',
          transform: `translate(${terryState.x}px, ${terryState.y}px) rotate(${terryState.rotation}deg)`,
          transition: 'none', // Disable CSS transitions for smooth animation
        }}
        draggable={false}
      />
    </div>
  );
};

export default Terry;

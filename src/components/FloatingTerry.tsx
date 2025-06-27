import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Vector2 } from '../utils/Vector2';
import { Random } from '../utils/Random';

// UNITS IN THIS FILE:
// - All distances are in multiples of Terry's length. So if positionX is 0.5, Terry is half a Terry length to the right of his starting position.
// - All rotations are in degrees.
// - All velocities are in distance/rotation units per second, normalized to the framerate.
// - All accelerations are in velocities per second squared.

interface TerryState {
  position: Vector2;
  rotation: number;
  velocity: Vector2;
  angularVelocity: number;

  turnaroundDirection: Vector2; // Normalized/unitless
  isTurnaroundInProgress: boolean;
}

const Terry: React.FC = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [terrySize, setTerrySize] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // State for Terry's position and physics
  const [terryState, setTerryState] = useState<TerryState>({
    position: Vector2.zero(),
    rotation: 0,
    velocity: Vector2.zero(),
    angularVelocity: 0,
    turnaroundDirection: Vector2.zero(),
    isTurnaroundInProgress: false,
  });

  const BASE_PHYSICS_CONFIG = {
    TURNAROUND_DISTANCE: 0.12, // When Terry is further than this from the center, he will start turning around.
    TURNAROUND_ACCELERATION: 0.01,
    TURNAROUND_ANGLE_DEGREES_MIN: -5,
    TURNAROUND_ANGLE_DEGREES_MAX: 20, // Bias Terry towards moving around in a counterclockwise circle.

    GO_HOME_DISTANCE: 0.3, // When Terry is further than this from the center, he will go STRAIGHT back to the center, not the indirect path of a turnaround.
    GO_HOME_ACCELERATION: 0.6,
    GO_HOME_TARGET_SPEED: 1,

    // Terry will try to settle into these speeds, so long as he is within range.
    TARGET_SPEED: 0.018,
    TARGET_ANGULAR_SPEED: 1.8,

    TARGET_SPEED_RANGE: 0.2,

    // While within range, if Terry is faster/slower than the target speeds, these accelerations/decelerations will be applied to fix him.
    TARGET_SPEED_CORRECTION_ACCELERATION: 0.004,
    TARGET_SPEED_CORRECTION_DECELERATION: 0.8,
    TARGET_ANGULAR_VELOCITY_CORRECTION_ACCELERATION: 2,
    TARGET_ANGULAR_VELOCITY_DRAG_COEFFICIENT: 0.98, // Drag coefficient - closer to 1 means less drag, closer to 0 means more drag

    CLICK_LINEAR_IMPULSE_MAX: 0.5, // Linear impulse applied to Terry when clicking his exact center (scales to 0 towards his edge)
    CLICK_ANGULAR_IMPULSE_MAX: 75, // Angular impulse applied to Terry when clicking his furthest edge (scales to 0 towards his center)
  };

  // Have him move a bit faster on mobile. The screen is smaller, so we need more (relative) movement to be noticeable.
  const MOBILE_OVERRIDES = {
    TARGET_VELOCITY: 0.06,
    TARGET_ANGULAR_VELOCITY: 3.3,
  };

  const PHYSICS_CONFIG = isMobile 
    ? { ...BASE_PHYSICS_CONFIG, ...MOBILE_OVERRIDES }
    : BASE_PHYSICS_CONFIG;
    
  // Track Terry's size in pixels to use as a scale reference. This allows our physics to be independent of the screen resolution.
  useEffect(() => {
    const updateTerrySize = () => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        // Terry is always square, so using either width or height should be fine either way.
        setTerrySize(Math.max(rect.width, rect.height));
      }
    };

    const updateIsMobile = () => {
      // Consider mobile if screen width is less than 768px OR if it's actually a mobile device
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isSmallScreen || isMobileUserAgent);
    };

    updateTerrySize();
    updateIsMobile();
    
    const handleResize = () => {
      updateTerrySize();
      updateIsMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    
    setPrefersReducedMotion(mediaQuery.matches);  
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Convert between our two units: pixels, and Terry units (1 terry unit == 1 length of Terry)
  const terryToPixels = (terryUnits: number) => terryUnits * terrySize;
  const pixelsToTerry = (pixels: number) => terrySize > 0 ? pixels / terrySize : 0;

  // Initialize Terry
  useEffect(() => {
    const initialVelocity = Vector2.fromAngle(Random.angleRadians(), PHYSICS_CONFIG.TARGET_SPEED);
    
    setTerryState(prevState => ({
      ...prevState,
      position: Vector2.zero(),
      velocity: initialVelocity,
      angularVelocity: Random.sign() * PHYSICS_CONFIG.TARGET_ANGULAR_SPEED,
      isTurnaroundInProgress: false,
    }));
  }, [isMobile]);

  // Physics update function. Called once per frame by the animation loop, below.
  // deltaTime is the number of seconds (usually small like 0.016) since the last time this was called.
  const updatePhysics = useCallback((deltaTime: number) => {
    setTerryState(prevState => {
      const newState = { ...prevState };
      
      const distanceFromCenter = newState.position.magnitude();

      // If we're too far away from the center, we need to head straight back.
      // Usually happens when you click on Terry to send him far.
      if (distanceFromCenter > PHYSICS_CONFIG.GO_HOME_DISTANCE) {
        newState.isTurnaroundInProgress = false;
        
        // Calculate direction vector towards center (0,0)
        const toCenter = newState.position.multiply(-1).normalized();
        
        // Calculate target velocity vector
        const targetVelocity = toCenter.multiply(PHYSICS_CONFIG.GO_HOME_TARGET_SPEED);
        
        // Calculate velocity difference to reach target
        const velocityDiff = targetVelocity.subtract(newState.velocity);
        
        // Apply acceleration towards target velocity, but don't overshoot
        const velocityDiffMagnitude = velocityDiff.magnitude();
        if (velocityDiffMagnitude > 0) {
          let acceleration = PHYSICS_CONFIG.GO_HOME_ACCELERATION * deltaTime;
          acceleration = Math.min(acceleration, velocityDiffMagnitude);
          const accelerationVector = velocityDiff.normalized().multiply(acceleration);
          
          newState.velocity = newState.velocity.add(accelerationVector);
        }
      }
      // Check if we need to start turning around
      else if (distanceFromCenter > PHYSICS_CONFIG.TURNAROUND_DISTANCE && !newState.isTurnaroundInProgress) {
        // Calculate direction straight back to center.
        const toCenter = newState.position.multiply(-1).normalized();
        
        // Pick the new direction to accelerate in
        const degreesToRadians = (Math.PI / 180);
        const randomOffsetDegrees = Random.range(PHYSICS_CONFIG.TURNAROUND_ANGLE_DEGREES_MIN, PHYSICS_CONFIG.TURNAROUND_ANGLE_DEGREES_MAX);
        const correctionAngleRadians = toCenter.angleRadians() + randomOffsetDegrees * degreesToRadians;
        
        newState.turnaroundDirection = Vector2.fromAngle(correctionAngleRadians);
        
        newState.isTurnaroundInProgress = true;
      }
      
      // If we're outside the turnaround distance, apply the turnaround acceleration
      if (distanceFromCenter > PHYSICS_CONFIG.TURNAROUND_DISTANCE && newState.isTurnaroundInProgress) {
        const acceleration = PHYSICS_CONFIG.TURNAROUND_ACCELERATION * deltaTime;
        newState.velocity = newState.velocity.add(newState.turnaroundDirection.multiply(acceleration));
      }
      
      // Stop the turnaround if we're back in range
      if (distanceFromCenter < PHYSICS_CONFIG.TURNAROUND_DISTANCE && newState.isTurnaroundInProgress) {
        newState.isTurnaroundInProgress = false;
      }

      // Apply velocity targeting (deceleration when too fast, acceleration when too slow) within range
      if (distanceFromCenter < PHYSICS_CONFIG.TARGET_SPEED_RANGE) {
        const velocityMagnitude = newState.velocity.magnitude();
        const normalizedVelocity = newState.velocity.normalized();

        if (velocityMagnitude > PHYSICS_CONFIG.TARGET_SPEED) {
          // Apply deceleration to slow down Terry
          let decelerationFactor = PHYSICS_CONFIG.TARGET_SPEED_CORRECTION_DECELERATION * deltaTime;
          decelerationFactor = Math.min(decelerationFactor, velocityMagnitude - PHYSICS_CONFIG.TARGET_SPEED); // Don't decelerate too much and overshoot the target
          
          newState.velocity = newState.velocity.subtract(normalizedVelocity.multiply(decelerationFactor));
        }
        if (velocityMagnitude < PHYSICS_CONFIG.TARGET_SPEED) {
          // Apply acceleration to speed up Terry
          let accelerationFactor = PHYSICS_CONFIG.TARGET_SPEED_CORRECTION_ACCELERATION * deltaTime;
          accelerationFactor = Math.min(accelerationFactor, PHYSICS_CONFIG.TARGET_SPEED - velocityMagnitude); // Don't accelerate too much and overshoot the target
                    
          newState.velocity = newState.velocity.add(normalizedVelocity.multiply(accelerationFactor));
        }

        
        const angularVelocityMagnitude = Math.abs(newState.angularVelocity);
        
        if (angularVelocityMagnitude > PHYSICS_CONFIG.TARGET_ANGULAR_SPEED) {
          // Apply angular drag - higher angular velocity results in more drag
          const dragFactor = Math.pow(PHYSICS_CONFIG.TARGET_ANGULAR_VELOCITY_DRAG_COEFFICIENT, deltaTime * 60); // Normalize to 60fps for consistent behavior
          newState.angularVelocity *= dragFactor;
          
          // If we're now close to the target, clamp to target to avoid oscillation
          const newMagnitude = Math.abs(newState.angularVelocity);
          if (newMagnitude <= PHYSICS_CONFIG.TARGET_ANGULAR_SPEED) {
            const direction = newState.angularVelocity > 0 ? 1 : -1;
            newState.angularVelocity = direction * PHYSICS_CONFIG.TARGET_ANGULAR_SPEED;
          }
        }
        if (angularVelocityMagnitude < PHYSICS_CONFIG.TARGET_ANGULAR_SPEED) {
          // Apply angular acceleration to speed up Terry's rotation
          let angularAccelerationFactor = PHYSICS_CONFIG.TARGET_ANGULAR_VELOCITY_CORRECTION_ACCELERATION * deltaTime;
          angularAccelerationFactor = Math.min(angularAccelerationFactor, PHYSICS_CONFIG.TARGET_ANGULAR_SPEED - angularVelocityMagnitude);

          const angularDirection = newState.angularVelocity !== 0 ? (newState.angularVelocity > 0 ? 1 : -1) : Random.sign();
          newState.angularVelocity += angularDirection * angularAccelerationFactor;
        }
      }
      
      // Update position based on velocity
      newState.position = newState.position.add(newState.velocity.multiply(deltaTime));
      
      // Update rotation based on angular velocity
      newState.rotation += newState.angularVelocity * deltaTime;
      
      // Keep rotation in reasonable bounds
      newState.rotation = newState.rotation % 360;

      return newState;
    });
  }, [isMobile]);

  // Animation loop. Calls updatePhysics once per frame.
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const deltaTime_milliseconds = currentTime - lastTimeRef.current;
        let deltaTime = deltaTime_milliseconds / 1000;
        
        // Cap delta time to prevent huge jumps when tab becomes active again.
        // requestAnimationFrame doesn't run while you're in another tab, so without capping it, we can end up with enormous delta times that send terry FLYING.
        const MAX_DELTA_TIME = 0.3;
        deltaTime = Math.min(deltaTime, MAX_DELTA_TIME);

        if (!prefersReducedMotion) // Don't animate if user prefers reduced motion
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
  }, [updatePhysics, prefersReducedMotion]);

  // Handle clicks on Terry
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!imgRef.current || !containerRef.current) return;

    // Get click position relative to Terry's center
    const rect = imgRef.current.getBoundingClientRect();
    const terryCenter = Vector2.from(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    const clickPosition = Vector2.from(event.clientX, event.clientY);
    const clickOffset = clickPosition.subtract(terryCenter);

    const distanceFromCenterPixels = clickOffset.magnitude();
    const terryRadius = terrySize / 2;
    const normalizedDistance = Math.min(distanceFromCenterPixels / terryRadius, 1);

    let linearImpulseMagnitude = 0;
    let angularImpulseMagnitude = 0;
    let angularImpulseDirection = 0;

    // Different click reaction behavior on mobile vs desktop.
    if (isMobile)
    {
      // On mobile: tapping the center causes him to spin fastest, tapping the edge causes him to run away from your finger.
      linearImpulseMagnitude = PHYSICS_CONFIG.CLICK_LINEAR_IMPULSE_MAX * normalizedDistance;
      angularImpulseMagnitude = PHYSICS_CONFIG.CLICK_ANGULAR_IMPULSE_MAX * (1 - normalizedDistance);

      // The direction he spins when you tap him changes every 7 seconds.
      angularImpulseDirection = Math.floor(Date.now() / 7000) % 2 === 0 ? -1 : 1;
    }
    else
    {
      // On desktop: clicking the center causes him to move fastest, clicking the edge causes him to spin fastest (like you're grabbing his hand and flinging him!)
      linearImpulseMagnitude = PHYSICS_CONFIG.CLICK_LINEAR_IMPULSE_MAX * (1 - normalizedDistance);
      angularImpulseMagnitude = PHYSICS_CONFIG.CLICK_ANGULAR_IMPULSE_MAX * normalizedDistance;

      // The direction he spins is based on which side of him you click.
      angularImpulseDirection = clickOffset.x > 0 ? -1 : 1;
    }
    
    // Calculate direction from cursor to Terry's center (opposite of click direction)
    const awayDirection = distanceFromCenterPixels > 0 
      ? clickOffset.multiply(-1).normalized()
      : new Vector2(0, 1);
    
    const linearImpulse = awayDirection.multiply(linearImpulseMagnitude);
    const angularImpulse = angularImpulseDirection * angularImpulseMagnitude;
    
    setTerryState(prevState => ({
      ...prevState,
      velocity: prevState.velocity.add(linearImpulse),
      angularVelocity: prevState.angularVelocity + angularImpulse,
    }));
  }, [terrySize]);

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
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '80vh',
          maxHeight: '80vh',
          position: 'absolute',
          transform: `translate(${terryToPixels(terryState.position.x)}px, ${terryToPixels(terryState.position.y)}px) rotate(${terryState.rotation}deg)`,
          transition: 'none', // Disable CSS transitions for smooth animation

          // A bunch of crap to prevent browsers from treating Terry as a regular image that you can select etc
          pointerEvents: 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          WebkitTouchCallout: 'none',
          msContentZooming: 'none',
          msTouchSelect: 'none',
        }}
        draggable={false}
        alt="" // Intentionally left blank
        role="presentation"
        aria-hidden="true"

        // Non-standard attribute just to disable the "visual search" crap in Edge
        // @ts-ignore
        disablevisualsearch="true"
      />
    </div>
  );
};

export default Terry;

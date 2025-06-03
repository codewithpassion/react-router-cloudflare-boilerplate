# Phase 6: User Experience & Polish

## Overview
Final phase focusing on user experience improvements, accessibility, performance optimization, and visual polish to create a world-class photography competition platform.

## Duration
**Estimated: 1 Week**

## Prerequisites
- ✅ Phase 1: Core Infrastructure completed
- ✅ Phase 2: Photo Submission completed
- ✅ Phase 3: Voting System completed
- ✅ Phase 4: Admin Dashboard completed
- ✅ Phase 5: Public Gallery completed

## Tasks

### 1. User Onboarding & Tour System

#### 1.1 Welcome Tour Component
**File to create:** `app/components/features/onboarding/welcome-tour.tsx`

```typescript
interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
}

interface WelcomeTourProps {
  isOpen: boolean;
  onComplete: () => void;
  userType: 'new' | 'returning';
}

export function WelcomeTour({ isOpen, onComplete, userType }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tourSteps: TourStep[] = userType === 'new' ? [
    {
      id: 'welcome',
      target: 'body',
      title: 'Welcome to PhotoCompete!',
      content: 'Let\'s take a quick tour to help you get started with our photography competition platform.',
      placement: 'bottom'
    },
    {
      id: 'competitions',
      target: '[data-tour="competitions-nav"]',
      title: 'Browse Competitions',
      content: 'Discover active photography competitions you can participate in.',
      placement: 'bottom'
    },
    {
      id: 'gallery',
      target: '[data-tour="gallery-nav"]',
      title: 'Photo Gallery',
      content: 'Explore amazing photos from our community and get inspired.',
      placement: 'bottom'
    },
    {
      id: 'profile',
      target: '[data-tour="profile-nav"]',
      title: 'Your Profile',
      content: 'Manage your photos, track your submissions, and view your achievements.',
      placement: 'left'
    },
    {
      id: 'submit',
      target: '[data-tour="submit-photo"]',
      title: 'Submit Your First Photo',
      content: 'Ready to participate? Click here to submit your first photo to a competition!',
      placement: 'bottom',
      showSkip: false
    }
  ] : [
    {
      id: 'whats-new',
      target: 'body',
      title: 'What\'s New',
      content: 'Check out the latest features and improvements we\'ve added.',
      placement: 'bottom'
    }
  ];
  
  return (
    <TourProvider
      steps={tourSteps}
      isOpen={isOpen}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onComplete={onComplete}
    >
      <TourOverlay />
    </TourProvider>
  );
}
```

#### 1.2 Progressive Onboarding System
**File to create:** `app/components/features/onboarding/progressive-onboarding.tsx`

```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isComplete: boolean;
  isOptional: boolean;
}

export function ProgressiveOnboarding() {
  const { user } = useAuth();
  const { useOnboardingProgress, useUpdateProgress } = useOnboarding();
  const { data: progress } = useOnboardingProgress();
  
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'profile-completion',
      title: 'Complete Your Profile',
      description: 'Add a profile photo and bio to help others discover your work.',
      component: ProfileCompletionStep,
      isComplete: !!user?.profileComplete,
      isOptional: false
    },
    {
      id: 'first-submission',
      title: 'Submit Your First Photo',
      description: 'Participate in your first competition to get started.',
      component: FirstSubmissionStep,
      isComplete: !!progress?.hasSubmitted,
      isOptional: false
    },
    {
      id: 'voting-tutorial',
      title: 'Learn About Voting',
      description: 'Discover how to vote on amazing photos from other photographers.',
      component: VotingTutorialStep,
      isComplete: !!progress?.hasVoted,
      isOptional: true
    },
    {
      id: 'community-engagement',
      title: 'Engage with the Community',
      description: 'Follow photographers and create collections of your favorite photos.',
      component: CommunityEngagementStep,
      isComplete: !!progress?.hasEngaged,
      isOptional: true
    }
  ];
  
  const activeStep = onboardingSteps.find(step => !step.isComplete && !step.isOptional);
  const completedSteps = onboardingSteps.filter(step => step.isComplete).length;
  const totalSteps = onboardingSteps.length;
  
  if (!activeStep) return null;
  
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">{activeStep.title}</h3>
                <p className="text-blue-700 text-sm">{activeStep.description}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-blue-600 mb-1">
                <span>Progress</span>
                <span>{completedSteps}/{totalSteps} completed</span>
              </div>
              <Progress 
                value={(completedSteps / totalSteps) * 100} 
                className="h-2" 
              />
            </div>
            
            <activeStep.component onComplete={() => {
              // Handle step completion
            }} />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Dismiss onboarding
            }}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Accessibility Improvements

#### 2.1 Keyboard Navigation Enhancement
**File to create:** `app/hooks/use-keyboard-navigation.ts`

```typescript
export function useKeyboardNavigation(options: {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
}) {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    onEscape,
    onEnter
  } = options;
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          if (enableArrowKeys) {
            // Handle arrow key navigation
            handleArrowNavigation(event);
          }
          break;
        case 'Tab':
          if (!enableTabNavigation) {
            event.preventDefault();
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableArrowKeys, enableTabNavigation, onEscape, onEnter]);
}

function handleArrowNavigation(event: KeyboardEvent) {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
  
  let nextIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
      break;
  }
  
  if (nextIndex !== currentIndex) {
    event.preventDefault();
    (focusableElements[nextIndex] as HTMLElement).focus();
  }
}
```

#### 2.2 Screen Reader Enhancements
**File to create:** `app/components/shared/screen-reader-content.tsx`

```typescript
interface ScreenReaderContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ScreenReaderOnly({ children, className }: ScreenReaderContentProps) {
  return (
    <span 
      className={cn(
        'sr-only absolute left-[-10000px] top-auto w-px h-px overflow-hidden',
        className
      )}
    >
      {children}
    </span>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}

export function LiveRegion({ 
  children, 
  politeness = 'polite', 
  atomic = false 
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Enhanced photo card with accessibility
export function AccessiblePhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      aria-label={`View photo "${photo.title}" by ${photo.photographer.name}. ${photo.voteCount} votes.`}
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        <img
          src={photo.filePath}
          alt={`${photo.title} - ${photo.description || 'Photography by ' + photo.photographer.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>
      
      <div className="mt-2" aria-hidden="true">
        <h3 className="font-medium truncate">{photo.title}</h3>
        <p className="text-sm text-gray-600 truncate">by {photo.photographer.name}</p>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <HeartIcon className="w-3 h-3" />
          <span>{photo.voteCount}</span>
        </div>
      </div>
      
      <ScreenReaderOnly>
        Photo details: {photo.description}. 
        Submitted to {photo.competition.title} competition.
        Press Enter to view full size and vote.
      </ScreenReaderOnly>
    </div>
  );
}
```

### 3. Performance Optimization

#### 3.1 Image Optimization System
**File to create:** `app/components/shared/optimized-image.tsx`

```typescript
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Generate responsive image URLs
  const generateSrcSet = (baseSrc: string) => {
    const sizes = [320, 640, 768, 1024, 1280, 1920];
    return sizes
      .map(size => `${baseSrc}?w=${size}&q=75 ${size}w`)
      .join(', ');
  };
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    onError?.();
  };
  
  // Lazy loading with intersection observer
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: priority
  });
  
  const shouldLoad = priority || inView;
  
  return (
    <div ref={ref} className="relative overflow-hidden">
      {/* Placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {/* Main Image */}
      {shouldLoad && (
        <img
          ref={imgRef}
          src={hasError ? '/images/placeholder-error.jpg' : src}
          srcSet={hasError ? undefined : generateSrcSet(src)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <ImageOffIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.2 Virtual Scrolling for Large Lists
**File to create:** `app/components/shared/virtual-gallery.tsx`

```typescript
import { FixedSizeGrid as Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

interface VirtualGalleryProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  columnCount?: number;
  rowHeight?: number;
}

export function VirtualGallery({
  photos,
  onPhotoClick,
  columnCount = 3,
  rowHeight = 300
}: VirtualGalleryProps) {
  const getColumnCount = (width: number) => {
    if (width < 768) return 1;
    if (width < 1024) return 2;
    if (width < 1536) return 3;
    return 4;
  };
  
  const PhotoItem = ({ columnIndex, rowIndex, style, data }: any) => {
    const { photos, onPhotoClick, columnCount } = data;
    const photoIndex = rowIndex * columnCount + columnIndex;
    const photo = photos[photoIndex];
    
    if (!photo) return null;
    
    return (
      <div style={style} className="p-2">
        <AccessiblePhotoCard
          photo={photo}
          onClick={() => onPhotoClick(photo)}
        />
      </div>
    );
  };
  
  return (
    <div className="h-screen">
      <AutoSizer>
        {({ height, width }) => {
          const actualColumnCount = getColumnCount(width);
          const rowCount = Math.ceil(photos.length / actualColumnCount);
          
          return (
            <Grid
              columnCount={actualColumnCount}
              columnWidth={width / actualColumnCount}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              itemData={{
                photos,
                onPhotoClick,
                columnCount: actualColumnCount
              }}
            >
              {PhotoItem}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
}
```

### 4. Advanced UI Animations

#### 4.1 Smooth Page Transitions
**File to create:** `app/components/shared/page-transition.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Enhanced photo card with micro-interactions
export function AnimatedPhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <motion.div
        className="aspect-square overflow-hidden rounded-lg bg-gray-100"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <OptimizedImage
          src={photo.filePath}
          alt={photo.title}
          className="w-full h-full object-cover"
        />
      </motion.div>
      
      <motion.div
        className="mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="font-medium truncate">{photo.title}</h3>
        <p className="text-sm text-gray-600 truncate">by {photo.photographer.name}</p>
        
        <motion.div
          className="flex items-center gap-1 text-sm text-gray-500 mt-1"
          whileHover={{ scale: 1.05 }}
        >
          <HeartIcon className="w-3 h-3" />
          <motion.span
            key={photo.voteCount}
            initial={{ scale: 1.2, color: '#ef4444' }}
            animate={{ scale: 1, color: '#6b7280' }}
            transition={{ duration: 0.3 }}
          >
            {photo.voteCount}
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
```

#### 4.2 Interactive Voting Animations
**File to create:** `app/components/features/voting/animated-vote-button.tsx`

```typescript
export function AnimatedVoteButton({
  photoId,
  currentVotes,
  userHasVoted,
  onVote
}: VoteButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [localVoteCount, setLocalVoteCount] = useState(currentVotes);
  const [localUserVoted, setLocalUserVoted] = useState(userHasVoted);
  
  const handleVote = async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Optimistic update
    setLocalUserVoted(!localUserVoted);
    setLocalVoteCount(prev => localUserVoted ? prev - 1 : prev + 1);
    
    try {
      await onVote();
    } catch (error) {
      // Revert on error
      setLocalUserVoted(userHasVoted);
      setLocalVoteCount(currentVotes);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };
  
  return (
    <motion.button
      onClick={handleVote}
      disabled={isAnimating}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full transition-colors',
        localUserVoted 
          ? 'bg-red-100 text-red-600 border border-red-200' 
          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
      )}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
    >
      <motion.div
        animate={{
          scale: isAnimating ? [1, 1.3, 1] : 1,
          rotate: isAnimating ? [0, 15, -15, 0] : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <HeartIcon 
          className={cn(
            'w-4 h-4 transition-colors',
            localUserVoted ? 'fill-current text-red-500' : 'text-gray-400'
          )} 
        />
      </motion.div>
      
      <AnimatePresence mode="wait">
        <motion.span
          key={localVoteCount}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="font-medium"
        >
          {localVoteCount}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
```

### 5. Error Handling & User Feedback

#### 5.1 Global Error Boundary
**File to create:** `app/components/shared/error-boundary.tsx`

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export function ErrorBoundary({ children, fallback: Fallback }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(new Error(event.message));
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(new Error(`Unhandled promise rejection: ${event.reason}`));
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const retry = () => {
    setError(null);
  };
  
  if (error) {
    if (Fallback) {
      return <Fallback error={error} retry={retry} />;
    }
    
    return <DefaultErrorFallback error={error} retry={retry} />;
  }
  
  return <>{children}</>;
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="space-y-3">
          <Button onClick={retry} className="w-full">
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reload Page
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Error Details
            </summary>
            <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
```

#### 5.2 Toast Notification System
**File to create:** `app/components/shared/toast-system.tsx`

```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  const success = (title: string, description?: string) => 
    addToast({ type: 'success', title, description });
  
  const error = (title: string, description?: string) => 
    addToast({ type: 'error', title, description });
  
  const warning = (title: string, description?: string) => 
    addToast({ type: 'warning', title, description });
  
  const info = (title: string, description?: string) => 
    addToast({ type: 'info', title, description });
  
  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const iconMap = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: AlertTriangleIcon,
    info: InfoIcon
  };
  
  const colorMap = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  
  const Icon = iconMap[toast.type];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={cn(
        'max-w-sm w-full border rounded-lg p-4 shadow-lg',
        colorMap[toast.type]
      )}
    >
      <div className="flex items-start">
        <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium">{toast.title}</h4>
          {toast.description && (
            <p className="text-sm mt-1 opacity-90">{toast.description}</p>
          )}
          {toast.action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toast.action.onClick}
              className="mt-2 p-0 h-auto"
            >
              {toast.action.label}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="p-1 h-auto ml-2"
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
```

### 6. Mobile Experience Optimization

#### 6.1 Touch Gestures for Photo Navigation
**File to create:** `app/hooks/use-touch-gestures.ts`

```typescript
export function useTouchGestures(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  threshold?: number;
}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    threshold = 50
  } = options;
  
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastDistance = useRef<number>(0);
  
  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      // Single touch - prepare for swipe
      touchStart.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      // Two fingers - prepare for pinch
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      lastDistance.current = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    }
  };
  
  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2 && onPinch) {
      // Handle pinch gesture
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (lastDistance.current > 0) {
        const scale = currentDistance / lastDistance.current;
        onPinch(scale);
      }
      
      lastDistance.current = currentDistance;
    }
  };
  
  const handleTouchEnd = (event: TouchEvent) => {
    if (!touchStart.current || event.touches.length > 0) return;
    
    const touchEnd = event.changedTouches[0];
    const deltaX = touchEnd.clientX - touchStart.current.x;
    const deltaY = touchEnd.clientY - touchStart.current.y;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (Math.max(absDeltaX, absDeltaY) < threshold) return;
    
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
    
    touchStart.current = null;
  };
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}
```

#### 6.2 Mobile-Optimized Photo Viewer
**File to create:** `app/components/features/gallery/mobile-photo-viewer.tsx`

```typescript
export function MobilePhotoViewer({
  photos,
  currentIndex,
  onClose,
  onIndexChange
}: {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const touchGestures = useTouchGestures({
    onSwipeLeft: () => {
      if (currentIndex < photos.length - 1) {
        onIndexChange(currentIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
    },
    onSwipeDown: () => {
      if (scale === 1) onClose();
    },
    onPinch: (newScale) => {
      setScale(prev => Math.min(Math.max(prev * newScale, 1), 4));
    }
  });
  
  const currentPhoto = photos[currentIndex];
  
  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex justify-between items-center text-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <XIcon className="w-5 h-5" />
          </Button>
          <span className="text-sm">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
      </div>
      
      {/* Photo Container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        {...touchGestures}
      >
        <motion.div
          className="relative"
          animate={{
            scale,
            x: position.x,
            y: position.y
          }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <img
            src={currentPhoto.filePath}
            alt={currentPhoto.title}
            className="max-w-full max-h-full object-contain"
            onDoubleClick={() => {
              setScale(scale === 1 ? 2 : 1);
              setPosition({ x: 0, y: 0 });
            }}
          />
        </motion.div>
      </div>
      
      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Photo Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 text-white">
        <h3 className="font-medium">{currentPhoto.title}</h3>
        <p className="text-sm opacity-90">by {currentPhoto.photographer.name}</p>
        <div className="flex items-center gap-4 mt-2 text-sm opacity-75">
          <span className="flex items-center gap-1">
            <HeartIcon className="w-3 h-3" />
            {currentPhoto.voteCount}
          </span>
          <span>{currentPhoto.competition.title}</span>
        </div>
      </div>
    </div>
  );
}
```

## Acceptance Criteria

### ✅ User Experience
- [ ] Onboarding guides new users through key features
- [ ] Progressive onboarding doesn't overwhelm users
- [ ] Welcome tour is helpful and skippable
- [ ] User journey feels intuitive and guided
- [ ] Help tooltips appear in context

### ✅ Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Screen readers can navigate the application
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Focus indicators are clearly visible
- [ ] Alt text is descriptive and helpful

### ✅ Performance
- [ ] Images load quickly with optimization
- [ ] Virtual scrolling handles large galleries smoothly
- [ ] Page transitions are smooth and responsive
- [ ] Memory usage remains reasonable during long sessions
- [ ] Mobile performance is optimized

### ✅ Animations & Feedback
- [ ] Micro-interactions provide immediate feedback
- [ ] Loading states keep users informed
- [ ] Voting animations feel satisfying
- [ ] Page transitions are smooth
- [ ] Error states are helpful and actionable

### ✅ Mobile Experience
- [ ] Touch gestures work intuitively
- [ ] Photo viewer supports pinch-to-zoom
- [ ] Swipe navigation feels natural
- [ ] Mobile layout is optimized
- [ ] Performance on mobile devices is good

### ✅ Error Handling
- [ ] Global error boundary catches unexpected errors
- [ ] Toast notifications provide clear feedback
- [ ] Network errors are handled gracefully
- [ ] Users can recover from error states
- [ ] Development errors show helpful details

## Testing Checklist

### Manual Testing
- [ ] Test onboarding flow with new users
- [ ] Verify all animations and transitions
- [ ] Test touch gestures on mobile devices
- [ ] Check accessibility with screen readers
- [ ] Verify error handling in various scenarios
- [ ] Test performance with large datasets

### Accessibility Testing
- [ ] Test with screen reader software
- [ ] Verify keyboard navigation throughout app
- [ ] Check color contrast ratios
- [ ] Test with high contrast mode
- [ ] Verify ARIA labels and descriptions

### Performance Testing
- [ ] Test image loading performance
- [ ] Verify virtual scrolling with many items
- [ ] Check memory usage during long sessions
- [ ] Test on slower devices and connections
- [ ] Verify animation performance

### Mobile Testing
- [ ] Test touch gestures on various devices
- [ ] Verify responsive design breakpoints
- [ ] Check performance on mobile browsers
- [ ] Test orientation changes
- [ ] Verify mobile-specific features

## Dependencies

### New Dependencies
```json
{
  "react-virtualized-auto-sizer": "^1.0.24",
  "react-window": "^1.8.8",
  "framer-motion": "^12.6.3",
  "focus-trap-react": "^10.2.3",
  "@react-aria/focus": "^3.17.1"
}
```

## Notes

### Performance Best Practices
- Implement proper image optimization with responsive images
- Use virtual scrolling for large lists to maintain performance
- Lazy load images below the fold
- Minimize layout shifts with proper sizing
- Use web workers for heavy computations

### Accessibility Guidelines
- Follow WCAG 2.1 AA standards throughout
- Provide meaningful alt text for all images
- Ensure keyboard navigation works everywhere
- Use proper ARIA labels and descriptions
- Test with actual assistive technologies

### Animation Philosophy
- Use animations to guide user attention
- Keep animations fast and purposeful
- Provide options to reduce motion for accessibility
- Use easing functions that feel natural
- Ensure animations don't interfere with functionality

### Mobile-First Approach
- Design for touch interactions first
- Optimize for various screen sizes
- Consider one-handed usage patterns
- Test on actual devices, not just simulators
- Optimize for mobile performance constraints

### Error Handling Strategy
- Provide helpful error messages
- Allow users to recover from errors
- Log errors for debugging purposes
- Show appropriate loading and error states
- Handle network failures gracefully
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Animated,
    Easing,
    PanResponder,
} from 'react-native';
import { usePathname } from 'expo-router';

const { width, height } = Dimensions.get('window');

const TourOverlay = () => {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only claim responder if moved significantly (prevents capturing taps)
                return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.extractOffset();
            },
        })
    ).current;

    // Perfect positions based on YOUR HomeScreen layout
    const tourSteps = [
        {
            id: 'welcome',
            title: 'Welcome to Pillora!',
            description: 'Your personal medication assistant',
            position: { x: width / 2 - 140, y: 150 },
        },
        {
            id: 'upcoming_doses',
            title: 'Upcoming Doses',
            description: 'See medications due today',
            position: { x: 100, y: 100 }, // Upcoming Doses card (20px padding + 20px offset)
        },
        {
            id: 'active_meds',
            title: 'Active Medications',
            description: 'Track your current medicines',
            position: { x: 100, y: 200 }, // Active Meds card (right side)
        },
        {
            id: 'scan_medicine',
            title: 'Scan Medicine',
            description: 'Identify pills with camera',
            position: { x: 90, y: 380 }, // Top-left quick action
        },
        {
            id: 'reminders',
            title: 'Set Reminders',
            description: 'Never miss a dose',
            position: { x: width - 115, y: 380 }, // Top-right quick action
        },
        {
            id: 'find_pharmacies',
            title: 'Find Pharmacies',
            description: 'Locate nearby stores',
            position: { x: 90, y: 500 }, // Bottom-left quick action
        },
        {
            id: 'analytics',
            title: 'Analytics',
            description: 'View your medication insights',
            position: { x: width - 115, y: 500 }, // Bottom-right quick action
        },
    ];

    // Start pulse animation
    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    useEffect(() => {
        // Auto-start tour when on home screen
        if (pathname === '/home' && !visible) {
            setTimeout(() => {
                setVisible(true);
                startPulse();
            }, 1500);
        }
    }, [pathname]);

    const nextStep = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setVisible(false);
        }
    };

    const previousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const showTour = () => {
        setCurrentStep(0);
        setVisible(true);
        startPulse();
    };

    const hideTour = () => {
        setVisible(false);
        pulseAnim.stopAnimation();
    };

    // Only show on home screen
    if (pathname !== '/home') {
        return null;
    }

    if (!visible) {
        // Show floating button to start tour
        return (
            <Animated.View
                style={[
                    styles.floatingStartButtonContainer,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity style={styles.floatingStartButton} onPress={showTour} activeOpacity={0.8}>
                    <Text style={styles.floatingStartText}>🎯 Start Tour</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    const currentStepData = tourSteps[currentStep];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={hideTour}
        >
            {/* Semi-transparent overlay that shows your screen underneath */}
            <View style={styles.modalContainer}>
                {/* Dark overlay with reduced opacity */}
                <View style={styles.overlay} />

                {/* Skip button */}
                <TouchableOpacity style={styles.skipButton} onPress={hideTour}>
                    <Text style={styles.skipText}>Skip Tour</Text>
                </TouchableOpacity>

                {/* Restart button */}
                <TouchableOpacity style={styles.restartButton} onPress={showTour}>
                    <Text style={styles.restartText}>Restart</Text>
                </TouchableOpacity>

                {/* Highlight circle with pulse animation */}
                {currentStepData.id !== 'welcome' && (
                    <Animated.View
                        style={[
                            styles.highlightContainer,
                            {
                                left: currentStepData.position.x - 50,
                                top: currentStepData.position.y - 50,
                                transform: [{ scale: pulseAnim }],
                            }
                        ]}
                    >
                        {/* Outer glow */}
                        <View style={styles.outerGlow} />
                        {/* Middle ring */}
                        <View style={styles.middleRing} />
                        {/* Inner circle */}
                        <View style={styles.innerCircle} />
                    </Animated.View>
                )}

                {/* Tooltip - positioned based on step */}
                <View style={[
                    styles.tooltip,
                    {
                        top: currentStepData.id === 'welcome'
                            ? currentStepData.position.y + 80
                            : currentStepData.position.y + 100
                    }
                ]}>
                    <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
                    <Text style={styles.tooltipDescription}>
                        {currentStepData.description}
                    </Text>
                    <View style={styles.tooltipFooter}>
                        <Text style={styles.stepCounter}>
                            {currentStep + 1} / {tourSteps.length}
                        </Text>
                        <View style={styles.tooltipButtons}>
                            {currentStep > 0 && (
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={previousStep}
                                >
                                    <Text style={styles.secondaryButtonText}>Back</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={nextStep}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {currentStep === tourSteps.length - 1 ? 'Got it!' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Light overlay - shows your screen clearly
    },
    highlightContainer: {
        position: 'absolute',
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    outerGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
    },
    middleRing: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(14, 165, 233, 0.3)',
        borderWidth: 2,
        borderColor: 'rgba(14, 165, 233, 0.5)',
    },
    innerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(14, 165, 233, 0.4)',
        borderWidth: 3,
        borderColor: '#0EA5E9',
        borderStyle: 'dashed',
    },
    tooltip: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    tooltipDescription: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 20,
    },
    tooltipFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepCounter: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    tooltipButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#48b8ecff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#475569',
        fontWeight: '600',
        fontSize: 14,
    },
    skipButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    skipText: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '600',
    },
    restartButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    restartText: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '600',
    },
    floatingStartButtonContainer: {
        position: 'absolute',
        bottom: 180,
        right: 20,
        zIndex: 9999,
    },
    floatingStartButton: {
        backgroundColor: '#0EA5E9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    floatingStartText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default TourOverlay;
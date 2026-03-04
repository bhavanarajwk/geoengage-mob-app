import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Custom Alert component matching app theme
 * Modern, dark-themed alert with smooth animations
 */
const CustomAlert = ({ visible, title, message, buttons = [], onDismiss }) => {
    const defaultButtons = buttons.length > 0 ? buttons : [
        { text: 'OK', onPress: onDismiss, style: 'primary' }
    ];

    const getIconForTitle = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('error') || lowerTitle.includes('failed')) {
            return { name: 'alert-circle', color: '#dc2626' };
        }
        if (lowerTitle.includes('success')) {
            return { name: 'check-circle', color: '#10b981' };
        }
        if (lowerTitle.includes('warning') || lowerTitle.includes('network')) {
            return { name: 'alert', color: '#f59e0b' };
        }
        return { name: 'information', color: '#4285F4' };
    };

    const icon = getIconForTitle(title);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.alertContainer}>
                    {/* Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
                        <Icon name={icon.name} size={32} color={icon.color} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {defaultButtons.map((button, index) => {
                            const isPrimary = button.style === 'primary' || defaultButtons.length === 1;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
                                        defaultButtons.length === 1 && styles.buttonFull
                                    ]}
                                    onPress={() => {
                                        button.onPress?.();
                                        onDismiss?.();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        backgroundColor: '#1e3a5f',
        borderRadius: 16,
        padding: 24,
        width: SCREEN_WIDTH - 64,
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#a8a8b3',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonFull: {
        width: '100%',
    },
    buttonPrimary: {
        backgroundColor: '#4285F4',
    },
    buttonSecondary: {
        backgroundColor: '#0f3460',
        borderWidth: 1,
        borderColor: '#4285F4',
    },
    buttonTextPrimary: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: '#4285F4',
        fontSize: 16,
        fontWeight: '600',
    },
});

/**
 * Hook for managing custom alert state
 * Usage:
 * const alert = useCustomAlert();
 * alert.show('Title', 'Message');
 * alert.show('Title', 'Message', [{ text: 'Cancel' }, { text: 'OK', style: 'primary' }]);
 */
export const useCustomAlert = () => {
    const [alertState, setAlertState] = React.useState({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const show = (title, message, buttons = []) => {
        setAlertState({ visible: true, title, message, buttons });
    };

    const hide = () => {
        setAlertState(prev => ({ ...prev, visible: false }));
    };

    const AlertComponent = () => (
        <CustomAlert
            visible={alertState.visible}
            title={alertState.title}
            message={alertState.message}
            buttons={alertState.buttons}
            onDismiss={hide}
        />
    );

    return { show, hide, AlertComponent };
};

export default CustomAlert;

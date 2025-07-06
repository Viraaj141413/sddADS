export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export const checkDeviceMemory = async (): Promise<{
  deviceId: string;
  remembered: boolean;
  permanent?: boolean;
  autoLogin?: boolean;
  userId?: string;
}> => {
  try {
    const response = await fetch('/api/viraaj/device-check', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();

      if (data.autoLogin) {
        console.log('🔐 AUTO-LOGIN: Device memory found, logging in automatically');
        window.location.reload(); // Reload to show logged in state
      }

      return {
        deviceId: data.deviceId,
        remembered: data.remembered || false,
        permanent: data.permanent || false,
        autoLogin: data.autoLogin || false,
        userId: data.userId,
      };
    }

    throw new Error('Device check failed');
  } catch (error) {
    console.error('Device memory check error:', error);
    return {
      deviceId: generateDeviceId(),
      remembered: false,
      permanent: false,
    };
  }
};
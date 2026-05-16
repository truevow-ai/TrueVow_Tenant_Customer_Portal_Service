'use client';

import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useCompanyToast() {
  const showToast = (type: ToastType, title: string, options?: ToastOptions) => {
    const config = {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    };

    switch (type) {
      case 'success':
        toast.success(title, config);
        break;
      case 'error':
        toast.error(title, config);
        break;
      case 'warning':
        toast.warning(title, config);
        break;
      case 'info':
      default:
        toast.info(title, config);
        break;
    }
  };

  // Company operation specific toasts
  const companyOperations = {
    // Team operations
    teamMemberInvited: (email: string) =>
      showToast('success', 'Team Member Invited', {
        description: `Invitation sent to ${email}`,
      }),
    
    teamMemberRemoved: (name: string) =>
      showToast('success', 'Team Member Removed', {
        description: `${name} has been removed from your team`,
      }),
    
    teamMemberUpdated: (name: string) =>
      showToast('success', 'Team Member Updated', {
        description: `${name}'s permissions have been updated`,
      }),

    // Billing operations
    paymentSuccessful: (amount: string) =>
      showToast('success', 'Payment Successful', {
        description: `Payment of ${amount} has been processed`,
      }),
    
    paymentFailed: (reason: string) =>
      showToast('error', 'Payment Failed', {
        description: reason,
      }),
    
    subscriptionUpdated: (plan: string) =>
      showToast('success', 'Subscription Updated', {
        description: `Your subscription has been updated to ${plan}`,
      }),

    // Settings operations
    settingsSaved: () =>
      showToast('success', 'Settings Saved', {
        description: 'Your changes have been saved successfully',
      }),
    
    settingsError: (message: string) =>
      showToast('error', 'Settings Error', {
        description: message,
      }),

    // Service operations
    serviceActivated: (serviceName: string) =>
      showToast('success', 'Service Activated', {
        description: `${serviceName} has been activated for your account`,
      }),
    
    serviceDeactivated: (serviceName: string) =>
      showToast('info', 'Service Deactivated', {
        description: `${serviceName} has been deactivated`,
      }),

    // Referral operations
    referralCreated: (refId: string) =>
      showToast('success', 'Referral Created', {
        description: `Referral ${refId} has been created successfully`,
      }),
    
    referralUpdated: (refId: string) =>
      showToast('success', 'Referral Updated', {
        description: `Referral ${refId} has been updated`,
      }),

    // General operations
    dataExported: () =>
      showToast('success', 'Export Complete', {
        description: 'Your data export is ready for download',
      }),
    
    actionConfirmed: (action: string) =>
      showToast('success', 'Action Confirmed', {
        description: `${action} has been completed successfully`,
      }),
    
    errorOccurred: (message: string) =>
      showToast('error', 'Error Occurred', {
        description: message,
      }),

    // Generic methods
    success: (title: string, description?: string) =>
      showToast('success', title, { description }),
    
    error: (title: string, description?: string) =>
      showToast('error', title, { description }),
    
    warning: (title: string, description?: string) =>
      showToast('warning', title, { description }),
    
    info: (title: string, description?: string) =>
      showToast('info', title, { description }),
  };

  return companyOperations;
}

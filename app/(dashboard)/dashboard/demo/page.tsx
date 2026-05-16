'use client';

// Button component defined locally at bottom of file
import { useCompanyToast } from '@/hooks/useCompanyToast';

export default function DemoPage() {
  const toast = useCompanyToast();

  const handleTeamActions = () => {
    toast.teamMemberInvited('john@example.com');
    setTimeout(() => toast.teamMemberUpdated('John Doe'), 1000);
    setTimeout(() => toast.teamMemberRemoved('Jane Smith'), 2000);
  };

  const handleBillingActions = () => {
    toast.paymentSuccessful('$299.00');
    setTimeout(() => toast.subscriptionUpdated('Enterprise'), 1000);
    setTimeout(() => toast.paymentFailed('Card declined'), 2000);
  };

  const handleServiceActions = () => {
    toast.serviceActivated('SETTLE Intelligence');
    setTimeout(() => toast.serviceDeactivated('LEVERAGE Validation'), 1000);
  };

  const handleReferralActions = () => {
    toast.referralCreated('REF-2024-001');
    setTimeout(() => toast.referralUpdated('REF-2024-001'), 1000);
  };

  const handleGeneralActions = () => {
    toast.settingsSaved();
    setTimeout(() => toast.dataExported(), 1000);
    setTimeout(() => toast.errorOccurred('Database connection timeout'), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Enterprise Features Demo</h1>
        <p className="mt-2 text-gray-600">
          Test the toast notifications, breadcrumbs, and company statistics sidebar
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Operations</h3>
          <div className="space-y-3">
            <Button onClick={handleTeamActions} variant="primary" fullWidth>
              Trigger Team Toasts
            </Button>
            <p className="text-sm text-gray-500">
              Shows member invited, updated, and removed notifications
            </p>
          </div>
        </div>

        {/* Billing Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Operations</h3>
          <div className="space-y-3">
            <Button onClick={handleBillingActions} variant="primary" fullWidth>
              Trigger Billing Toasts
            </Button>
            <p className="text-sm text-gray-500">
              Shows payment success, subscription update, and failure notifications
            </p>
          </div>
        </div>

        {/* Service Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Operations</h3>
          <div className="space-y-3">
            <Button onClick={handleServiceActions} variant="primary" fullWidth>
              Trigger Service Toasts
            </Button>
            <p className="text-sm text-gray-500">
              Shows service activation and deactivation notifications
            </p>
          </div>
        </div>

        {/* Referral Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Operations</h3>
          <div className="space-y-3">
            <Button onClick={handleReferralActions} variant="primary" fullWidth>
              Trigger Referral Toasts
            </Button>
            <p className="text-sm text-gray-500">
              Shows referral creation and update notifications
            </p>
          </div>
        </div>

        {/* General Operations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Operations</h3>
          <div className="space-y-3">
            <Button onClick={handleGeneralActions} variant="primary" fullWidth>
              Trigger General Toasts
            </Button>
            <p className="text-sm text-gray-500">
              Shows settings saved, data exported, and error notifications
            </p>
          </div>
        </div>

        {/* Custom Toasts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Toasts</h3>
          <div className="space-y-3">
            <Button 
              onClick={() => toast.success('Custom Success', 'This is a custom success message')}
              variant="success"
              fullWidth
            >
              Success Toast
            </Button>
            <Button 
              onClick={() => toast.error('Custom Error', 'This is a custom error message')}
              variant="danger"
              fullWidth
            >
              Error Toast
            </Button>
            <Button 
              onClick={() => toast.warning('Custom Warning', 'This is a custom warning message')}
              variant="warning"
              fullWidth
            >
              Warning Toast
            </Button>
          </div>
        </div>
      </div>

      {/* Features Guide */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Enterprise Features Included:</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Toast Notifications:</strong> Contextual feedback for all company operations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Breadcrumb Navigation:</strong> Dynamic breadcrumbs showing current location</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Company Statistics Sidebar:</strong> Real-time usage metrics and status indicators</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Status Definitions:</strong> Clear explanations of all system statuses</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Button component since we're using it
function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  fullWidth = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'success' | 'danger' | 'warning'; 
  fullWidth?: boolean;
}) {
  const baseClasses = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500",
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

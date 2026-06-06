export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="dashboard-panel max-w-xl w-full p-8 flex flex-col items-center text-center space-y-8">
        
        {/* Logo / Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-text-main">
            Event Management System
          </h1>
          <p className="text-text-muted text-sm">
            Control Panel Authentication
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-panel-border bg-dashboard-bg/50">
          <div className="w-2 h-2 rounded-full bg-status-ok"></div>
          <span className="text-xs font-medium text-text-muted">System Active</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <button className="btn-primary w-full">
            Sign In
          </button>
          <button className="btn-danger w-full sm:w-auto px-6">
            Emergency Access
          </button>
        </div>
        
      </div>
    </div>
  );
}

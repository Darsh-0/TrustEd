export function ConnectWallet({ account, onConnect, onDisconnect }) {
  if (account) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button
          onClick={onDisconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
    >
      Connect MetaMask
    </button>
  );
}

import { useWidget } from "../context/WidgetContext";
import quickMainIcon from "../assets/Group 1658.png";
import todoActiveIcon from "../assets/Group 1707.png";
import inboxIdleIcon from "../assets/Group 1899.png";
import todoIdleIcon from "../assets/Group 1900.png";
import inboxActiveIcon from "../assets/Group 1904.png";

const QUICKS = [
  {
    id: "todo",
    label: "Task",
    activeSrc: todoActiveIcon,
    idleSrc: todoIdleIcon,
  },
  {
    id: "messaging",
    label: "Inbox",
    activeSrc: inboxActiveIcon,
    idleSrc: inboxIdleIcon,
  },
];

export default function FloatingButton() {
  const {
    activeTab,
    closeWidget,
    isOpen,
    openWidget,
    resetMessagingState,
    setActiveTab,
  } = useWidget();

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);

    if (tabId === "messaging") {
      resetMessagingState();
    }

    openWidget();
  };

  const handleToggleQuick = () => {
    if (isOpen) {
      closeWidget();
      return;
    }

    openWidget();
  };

  return (
    <div className="fixed bottom-4 right-3 z-50 flex items-end gap-2 sm:bottom-6 sm:right-6 sm:gap-3">
      <div
        className={`flex items-end gap-2 transition-all duration-300 ease-in-out sm:gap-3 ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-4 opacity-0"
        }`}
      >
        {QUICKS.map((quick) => {
          const isActive = activeTab === quick.id;
          const currentIcon = isActive ? quick.activeSrc : quick.idleSrc;

          return (
            <div key={quick.id} className="flex flex-col items-center gap-2">
              <button
                type="button"
                aria-label={`Open ${quick.label.toLowerCase()} panel`}
                aria-pressed={isActive}
                onClick={() => handleSelectTab(quick.id)}
                className="grid h-12 w-12 place-items-center rounded-full bg-transparent transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-white/25 sm:h-14 sm:w-14"
              >
                <img
                  src={currentIcon}
                  alt={quick.label}
                  className="h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14"
                  draggable="false"
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label={isOpen ? "Close quick tabs" : "Open quick tabs"}
          aria-pressed={isOpen}
          onClick={handleToggleQuick}
          className="grid h-12 w-12 place-items-center rounded-full bg-transparent transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:h-14 sm:w-14"
        >
          <img
            src={quickMainIcon}
            alt="Quick menu"
            className="h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14"
            draggable="false"
          />
        </button>
      </div>
    </div>
  );
}

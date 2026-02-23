import { useState } from "react";
import { useParams } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import StatusBadge from "../../components/StatusBadge";
import ConfirmModal from "../../components/ConfirmModal";
import toast from "react-hot-toast";

export default function EmployeeDetail() {
  const { id } = useParams();

  const [totalLeaves, setTotalLeaves] = useState([
    { title: "Casual Leave", total: 15, taken: 5 },
    { title: "Sick Leave", total: 10, taken: 2 },
    { title: "Flexible Cultural", total: 5, taken: 1 },
  ]);

  const [history, setHistory] = useState([
    {
      id: 1,
      month: "Jan",
      type: "Casual Leave",
      days: 3,
      status: "Pending",
    },
    {
      id: 2,
      month: "Feb",
      type: "Sick Leave",
      days: 2,
      status: "Pending",
    },
  ]);

  const [modal, setModal] = useState({
    open: false,
    leaveId: null,
    action: "",
  });

  const handleDecision = () => {
    const { leaveId, action } = modal;

    setHistory((prev) =>
      prev.map((item) =>
        item.id === leaveId ? { ...item, status: action } : item,
      ),
    );

    // Deduct leave only if approved
    if (action === "Approved") {
      const leaveItem = history.find((item) => item.id === leaveId);

      setTotalLeaves((prev) =>
        prev.map((leave) =>
          leave.title === leaveItem.type
            ? {
                ...leave,
                taken: leave.taken + leaveItem.days,
              }
            : leave,
        ),
      );
    }

    toast.success(`Leave ${action}`);
    setModal({ open: false, leaveId: null, action: "" });
  };

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold text-textDark">Employee Details</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {totalLeaves.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Days</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr
                key={item.id}
                className={`border-t transition ${
                  item.status !== "Pending"
                    ? "bg-green-50/40"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="p-4">{item.month}</td>
                <td className="p-4">{item.type}</td>
                <td className="p-4">{item.days}</td>

                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>

                <td className="p-4 space-x-2">
                  {item.status === "Pending" ? (
                    <>
                      <button
                        onClick={() =>
                          setModal({
                            open: true,
                            leaveId: item.id,
                            action: "Approve",
                          })
                        }
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:scale-105 transition"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          setModal({
                            open: true,
                            leaveId: item.id,
                            action: "Reject",
                          })
                        }
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:scale-105 transition"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={modal.open}
        onClose={() => setModal({ open: false, leaveId: null, action: "" })}
        onConfirm={handleDecision}
        actionType={modal.action}
      />
    </div>
  );
}

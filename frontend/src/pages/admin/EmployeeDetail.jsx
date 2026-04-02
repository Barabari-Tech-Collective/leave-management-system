import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import StatusBadge from "../../components/StatusBadge";
import ConfirmModal from "../../components/ConfirmModal";
import toast from "react-hot-toast";
import API from "../../api/axiosConfig";

export default function EmployeeDetail() {
  const { id } = useParams();

  const [totalLeaves, setTotalLeaves] = useState([]);

  const [history, setHistory] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    leaveId: null,
    action: "",
  });

  useEffect(() => {
  const fetchLeaves = async () => {
    const res = await API.get(`/leave/employee/${id}`);
    setHistory(res.data);
    setTotalLeaves([
  {
    title: "Casual Leave",
    total: res.data.leaveBalance.casual.total,
    taken: res.data.leaveBalance.casual.taken,
  },
  ]);
};

  fetchLeaves();
}, [id]);

  

   const handleDecision = async () => {
  const { leaveId, action } = modal;

  try {
    await API.put(`/leave/status/${leaveId}`, {
      status: action.toLowerCase()
    });

    toast.success(`Leave ${action}`);
  } catch (err) {
    toast.error("Failed");
    console.log(err, "Error updating leave status");
  }

  setModal({ open: false, leaveId: null, action: "" });
};

  return (
    <div className="space-y-7">
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
              <th className="p-4 text-left">From</th>
              <th className="p-4 text-left">To</th>
              <th className="p-4 text-left">Reason</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
  {history.length === 0 ? (
    <tr>
      <td colSpan="8" className="text-center p-6 text-gray-400">
        No leave history found
      </td>
    </tr>
  ) : (
    history.map((item) => (
      <tr
        key={item._id}
        className={`border-t transition ${
          item.status !== "pending"
            ? "bg-green-50/40"
            : "hover:bg-gray-50"
        }`}
      >
                <td className="p-4">{item.month}</td>
                <td className="p-4">{item.type}</td>
                <td className="p-4">{item.days}</td>
                <td className="p-4">{item.from}</td>
                <td className="p-4">{item.to}</td>
                <td className="p-4 max-w-xs truncate">{item.reason}</td>
                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>

                <td className="p-4 space-x-2">
                  {item.status === "pending" ? (
                    <>
                      <button
                        onClick={() =>
                          setModal({
                            open: true,
                            leaveId: item._id,
                            action: "approved",
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
                            leaveId: item._id,
                            action: "rejected",
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
            )))}
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

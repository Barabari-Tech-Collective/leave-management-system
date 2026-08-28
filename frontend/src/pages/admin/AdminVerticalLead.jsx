import { useState, useEffect } from "react";
import API from "../../api/axiosConfig";

const VERTICALS = ["Program", "Placement", "EdTech", "Operations", "None"];

export default function AdminVerticalLead() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await API.get("/users/all");
      setUsers(res.data);
    };
    fetchUsers();
  }, []);

  const handleUpdateLead = async (id, currentLeadStatus, currentVertical) => {
    try {
      const res = await API.put(`/users/update-lead/${id}`, {
        isVerticalLead: !currentLeadStatus,
        vertical: currentVertical,
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, ...res.data } : u))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerticalChange = async (id, newVertical, currentLeadStatus) => {
    try {
      const res = await API.put(`/users/update-lead/${id}`, {
        isVerticalLead: currentLeadStatus,
        vertical: newVertical,
      });

      setUsers((prev) =>
      prev.map((u) => (u._id === id ? { ...u, ...res.data } : u))
    );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Manage Vertical Leads & Teams
      </h2>

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl shadow border border-gray-100 gap-4"
          >
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Vertical Selection Dropdown */}
              <select
                value={user.vertical || "None"}
                onChange={(e) =>
                  handleVerticalChange(
                    user._id,
                    e.target.value,
                    user.isVerticalLead
                  )
                }
                className="p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-primary"
              >
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>
                    {v} Vertical
                  </option>
                ))}
              </select>

              {/* Toggle Lead Button */}
              <button
                onClick={() =>
                  handleUpdateLead(user._id, user.isVerticalLead, user.vertical)
                }
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition ${
                  user.isVerticalLead
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 hover:bg-gray-500"
                }`}
              >
                {user.isVerticalLead ? "Vertical Lead ✓" : "Make Lead"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
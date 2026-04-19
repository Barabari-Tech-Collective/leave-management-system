import {useState, useEffect} from "react";
import API from "../../api/axiosConfig";

export default function AdminManager() {

const [users, setUsers] = useState([]);

useEffect(() => {
  const fetchUsers = async () => {
    const res = await API.get("/users/all");
    setUsers(res.data);
  };

  fetchUsers();
}, []);
const toggleManager = async (id, currentValue) => {
  try {
    const res = await API.put(`/users/toggle-manager/${id}`, {
      isManager: !currentValue
    });

    setUsers((prev) =>
      prev.map((u) =>
        u._id === id ? { ...u, isManager: res.data.isManager } : u
      )
    );
  } catch (err) {
    console.error(err);
  }
};
return (
    <div className="p-6">
  <h2 className="text-2xl font-bold mb-6">Manage Managers</h2>

  <div className="space-y-4">
    {users.map((user) => (
      <div
        key={user._id}
        className="flex justify-between items-center p-4 bg-white rounded-xl shadow"
      >
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <button
          onClick={() => toggleManager(user._id, user.isManager)}
          className={`px-4 py-2 rounded-lg text-white ${
            user.isManager ? "bg-green-500" : "bg-gray-400"
          }`}
        >
          {user.isManager ? "Manager" : "Make Manager"}
        </button>
      </div>
    ))}
  </div>
</div>
)

}

"use client";

import { useState } from "react";
import { useCreateFanout } from "@/hooks/useCreateFanout";
import { Schedule, scheduleToString } from "@/utils/schedule";
import { ScheduleEditor } from "./ScheduleEditor";

export function CreateFanout({ refresh }: { refresh: () => void }) {
  const [name, setName] = useState("");
  const [totalShares, setTotalShares] = useState(100);
  const [schedule, setSchedule] = useState<Schedule>({
    type: "daily",
  });
  const { loading, error, execute } = useCreateFanout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await execute({
      name,
      totalShares,
      schedule: scheduleToString(schedule),
      onSuccess: () => {
        setName("");
        setTotalShares(100);
      },
    });
    refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" name="create-fanout">
      {error && <div className="text-red-500">{error.message}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Fanout Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Total Shares
        </label>
        <input
          type="number"
          value={totalShares}
          onChange={(e) => setTotalShares(Number(e.target.value))}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <ScheduleEditor value={schedule} onChange={setSchedule} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating..." : "Create Fanout"}
      </button>
    </form>
  );
}

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
  const [acknowledged, setAcknowledged] = useState(false);
  const { loading, error, execute } = useCreateFanout();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acknowledged) {
      return;
    }

    await execute({
      name,
      totalShares,
      schedule: scheduleToString(schedule),
      onSuccess: () => {
        setName("");
        setTotalShares(100);
        setAcknowledged(false);
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

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-white">Important Disclosures</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>1. Distributions will only apply to assets for which you have enabled fanout</p>
          <p>2. The wallet currently does not support fanning out native SOL. Use wrapped SOL instead</p>
          <p>3. All transactions are FINAL and IRREVERSIBLE</p>
          <p>4. You are solely responsible for recipient addresses and legal compliance</p>
          <p>5. Technology risks exist that could affect functionality</p>
          <p className="text-gray-400 mt-2">
            You agree to use this feature in compliance with all applicable laws. For complete terms and important information, please refer to the full disclaimers in the{" "}
            <a
              href="https://github.com/helium/tuktuk-fanout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              project README file
            </a>
            .
          </p>
        </div>
        <div className="flex items-start mt-4">
          <input
            type="checkbox"
            id="acknowledge"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
          />
          <label htmlFor="acknowledge" className="ml-2 text-sm text-gray-300">
            I have read and understand the above disclosures and agree to the terms
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !acknowledged}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating..." : "Create Fanout"}
      </button>
    </form>
  );
}

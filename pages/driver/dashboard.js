import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function DriverDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard/driver");
      if (!res.ok) throw new Error("API Fehler");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <div className="p-6">⏳ Lade Dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">❌ Fehler: {error}</div>;

  const { statistics, upcomingRides, recentBookings } = data;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Fahrer-Dashboard</h1>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Aktive Fahrten" value={statistics.active_rides} />
        <StatCard title="Abgeschlossene Fahrten" value={statistics.completed_rides} />
        <StatCard title="Stornierte Fahrten" value={statistics.cancelled_rides} />
        <StatCard title="Einnahmen (€)" value={statistics.total_earnings} />
      </div>

      {/* Kommende Fahrten */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Kommende Fahrten</h2>
        <div className="space-y-4">
          {upcomingRides.length === 0 && <p>Keine geplanten Fahrten.</p>}
          {upcomingRides.map((ride) => (
            <div key={ride.id} className="border p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {ride.from_location} → {ride.to_location}
                  </p>
                  <p className="text-sm text-gray-600">
                    {ride.departure_date} {ride.departure_time}
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    Sitze gebucht:{" "}
                    <span className="font-semibold">
                      {ride.booked_seats || 0}/{ride.total_seats}
                    </span>
                  </p>
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => router.push(`/rides/edit/${ride.id}`)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Fahrt wirklich absagen?")) return;
                        try {
                          const res = await fetch(`/api/rides/${ride.id}/cancel`, {
                            method: "POST",
                          });
                          if (!res.ok) throw new Error("Absage fehlgeschlagen");
                          alert("Fahrt abgesagt");
                          fetchDashboard(); // Refresh Daten
                        } catch (err) {
                          alert("❌ Fehler: " + err.message);
                        }
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Absagen
                    </button>
                  </div>
                </div>
              </div>

              {ride.bookings?.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold">Mitfahrer:</p>
                  <ul className="list-disc pl-6 text-sm">
                    {ride.bookings.map((b, idx) => (
                      <li key={idx}>
                        {b.passenger_name} ({b.seats} Sitz(e)) – Status:{" "}
                        <span className="italic">{b.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Letzte Buchungen */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Letzte Buchungen</h2>
        <div className="space-y-4">
          {recentBookings.length === 0 && <p>Keine aktuellen Buchungen.</p>}
          {recentBookings.map((b) => (
            <div key={b.id} className="border p-4 rounded-lg shadow-sm">
              <p className="font-medium">
                {b.first_name} {b.last_name} – {b.email}
              </p>
              <p className="text-sm text-gray-600">
                Fahrt: {b.from_location} → {b.to_location} am {b.departure_date}{" "}
                {b.departure_time}
              </p>
              <p className="text-sm">Status: {b.status}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white border p-4 rounded-lg shadow-sm text-center">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-xl font-bold">{value || 0}</p>
    </div>
  );
}


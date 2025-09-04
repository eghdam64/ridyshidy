import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditRide() {
  const router = useRouter();
  const { id } = router.query;

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [validationError, setValidationError] = useState(null);

  // Fahrt laden
  useEffect(() => {
    if (!id) return;
    const fetchRide = async () => {
      try {
        const res = await fetch(`/api/rides/${id}`);
        if (!res.ok) throw new Error("Fehler beim Laden der Fahrt");
        const json = await res.json();
        setRide(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [id]);

  // 🔑 Validierung
  const validate = () => {
    if (!ride.from_location || !ride.to_location) {
      return "Start- und Zielort dürfen nicht leer sein.";
    }

    if (!ride.departure_date) {
      return "Bitte ein Abfahrtsdatum wählen.";
    }

    const today = new Date();
    const selectedDate = new Date(ride.departure_date);

    if (selectedDate < new Date(today.toDateString())) {
      return "Das Abfahrtsdatum darf nicht in der Vergangenheit liegen.";
    }

    if (!ride.departure_time) {
      return "Bitte eine Abfahrtszeit wählen.";
    }

    if (!/^\d{2}:\d{2}$/.test(ride.departure_time)) {
      return "Die Abfahrtszeit muss im Format HH:MM angegeben werden.";
    }

    if (!ride.total_seats || ride.total_seats < 1) {
      return "Die Anzahl der Sitze muss mindestens 1 sein.";
    }

    if (ride.price_per_seat === null || ride.price_per_seat < 0) {
      return "Preis pro Sitz darf nicht negativ sein.";
    }

    return null;
  };

  // Formatierer für Zeit (z. B. 9:0 → 09:00)
  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  // Speichern
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errorMsg = validate();
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    setValidationError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ride),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      alert("Fahrt erfolgreich aktualisiert ✅");
      router.push("/driver/dashboard");
    } catch (err) {
      alert("❌ Fehler: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">⏳ Lade Fahrt...</div>;
  if (error) return <div className="p-6 text-red-600">❌ Fehler: {error}</div>;
  if (!ride) return <div className="p-6">Keine Fahrt gefunden.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Fahrt bearbeiten</h1>

      {validationError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Von</label>
          <input
            type="text"
            value={ride.from_location || ""}
            onChange={(e) =>
              setRide({ ...ride, from_location: e.target.value })
            }
            className="w-full border rounded p-2"
            placeholder="z. B. Berlin"
          />
        </div>

        <div>
          <label className="block font-medium">Nach</label>
          <input
            type="text"
            value={ride.to_location || ""}
            onChange={(e) => setRide({ ...ride, to_location: e.target.value })}
            className="w-full border rounded p-2"
            placeholder="z. B. Hamburg"
          />
        </div>

        <div>
          <label className="block font-medium">Datum</label>
          <input
            type="date"
            value={ride.departure_date?.substring(0, 10) || ""}
            min={new Date().toISOString().split("T")[0]} // 🚀 nur heute oder später
            onChange={(e) =>
              setRide({ ...ride, departure_date: e.target.value })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Zeit</label>
          <input
            type="time"
            value={formatTime(ride.departure_time) || ""}
            onChange={(e) =>
              setRide({ ...ride, departure_time: formatTime(e.target.value) })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Sitze gesamt</label>
          <input
            type="number"
            min="1"
            value={ride.total_seats || 1}
            onChange={(e) =>
              setRide({ ...ride, total_seats: parseInt(e.target.value, 10) })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Preis pro Sitz (€)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={ride.price_per_seat || 0}
            onChange={(e) =>
              setRide({
                ...ride,
                price_per_seat: parseFloat(e.target.value),
              })
            }
            className="w-full border rounded p-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </form>
	  {/* 🗺️ Live-Vorschau */}
    	<div className="mt-6 p-4 border rounded-lg bg-gray-50 shadow-sm">
      		<h2 className="text-lg font-semibold mb-2">Vorschau der Fahrt</h2>
      		<p>
        	<strong>Von:</strong> {ride.from_location || "-"}
      		</p>
      		<p>
        	<strong>Nach:</strong> {ride.to_location || "-"}
      		</p>
      		<p>
        	<strong>Datum:</strong> {ride.departure_date || "-"}{" "}
        	<strong>Zeit:</strong> {ride.departure_time || "-"}
      		</p>
      		<p>
        	<strong>Sitze gesamt:</strong> {ride.total_seats || 0}{" "}
        	<strong>Preis pro Sitz:</strong> €{ride.price_per_seat || 0}
      		</p>
    	</div>
    </div>
  );
}


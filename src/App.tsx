/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BookingForm } from '@/components/BookingForm';
import { AdminDashboard } from '@/components/AdminDashboard';
import { MyBookings } from '@/components/MyBookings';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/lib/hooks';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Database } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'booking' | 'admin' | 'my-bookings'>('booking');
  const { user, role, loading } = useAuth();

  const seedRooms = async () => {
    const snapshot = await getDocs(collection(db, 'rooms'));
    if (!snapshot.empty) return;

    const rooms = [
      { floor: 1, type: 'male', capacity: 10, roomNumber: '101', occupiedBeds: 0 },
      { floor: 1, type: 'male', capacity: 10, roomNumber: '102', occupiedBeds: 0 },
      { floor: 2, type: 'female', capacity: 10, roomNumber: '201', occupiedBeds: 0 },
      { floor: 2, type: 'female', capacity: 10, roomNumber: '202', occupiedBeds: 0 },
      { floor: 3, type: 'private', capacity: 2, roomNumber: '301', occupiedBeds: 0 },
      { floor: 3, type: 'private', capacity: 2, roomNumber: '302', occupiedBeds: 0 },
      { floor: 3, type: 'group', capacity: 5, roomNumber: '303', occupiedBeds: 0 },
      { floor: 3, type: 'group', capacity: 5, roomNumber: '304', occupiedBeds: 0 },
    ];

    for (const room of rooms) {
      await addDoc(collection(db, 'rooms'), room);
    }
    alert('Rooms initialized!');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onViewChange={setView} currentView={view} />
      
      <main className="flex-grow">
        {view === 'booking' ? (
          <BookingForm />
        ) : view === 'admin' ? (
          <AdminDashboard />
        ) : (
          <MyBookings />
        )}
      </main>

      {role === 'admin' && (
        <div className="fixed bottom-4 right-4">
          <Button variant="outline" size="sm" onClick={seedRooms} className="gap-2 bg-white shadow-lg">
            <Database className="h-4 w-4" />
            Seed Rooms
          </Button>
        </div>
      )}

      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; 2026 ZenSpa Overseas. All rights reserved.
        </div>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}


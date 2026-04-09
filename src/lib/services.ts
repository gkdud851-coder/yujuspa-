import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface Reservation {
  id?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  adultsMale: number;
  adultsFemale: number;
  kidsMale: number;
  kidsFemale: number;
  courseId: 'vip-90' | 'vip-120';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pickupAddress: string;
  dropoffAddress: string;
  noPickup?: boolean;
  noDropoff?: boolean;
  assignedRoomId?: string;
  assignedBedId?: string;
  vehicleInfo?: {
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    vehicleImage?: string;
    dispatchTime?: string;
  };
  createdAt?: any;
}

export const reservationService = {
  async createReservation(data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) {
    return await addDoc(collection(db, 'reservations'), {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  },

  async updateReservation(id: string, data: Partial<Reservation>) {
    const ref = doc(db, 'reservations', id);
    return await updateDoc(ref, data);
  },

  subscribeToUserReservations(userId: string, callback: (reservations: Reservation[]) => void) {
    const q = query(collection(db, 'reservations'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const reservations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      callback(reservations);
    });
  },

  subscribeToAllReservations(callback: (reservations: Reservation[]) => void) {
    return onSnapshot(collection(db, 'reservations'), (snapshot) => {
      const reservations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      callback(reservations);
    });
  },

  async checkAvailability(date: string, time: string, guests: { am: number, af: number, km: number, kf: number }) {
    // Simplified check: Get all reservations for that date/time
    // In a real app, we'd check overlapping time windows (90/120 min)
    const q = query(collection(db, 'reservations'), 
      where('date', '==', date), 
      where('time', '==', time),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const snapshot = await getDocs(q);
    const existingReservations = snapshot.docs.map(doc => doc.data() as Reservation);
    
    // Total guests already booked
    const booked = existingReservations.reduce((acc, res) => ({
      male: acc.male + res.adultsMale + res.kidsMale,
      female: acc.female + res.adultsFemale + res.kidsFemale,
      total: acc.total + res.adultsMale + res.adultsFemale + res.kidsMale + res.kidsFemale
    }), { male: 0, female: 0, total: 0 });

    // Total capacity (from rooms)
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    const rooms = roomsSnapshot.docs.map(doc => doc.data() as Room);
    const capacity = rooms.reduce((acc, room) => ({
      male: acc.male + (room.type === 'male' ? room.capacity : 0),
      female: acc.female + (room.type === 'female' ? room.capacity : 0),
      flexible: acc.flexible + (room.type === 'private' || room.type === 'group' ? room.capacity : 0),
      total: acc.total + room.capacity
    }), { male: 0, female: 0, flexible: 0, total: 0 });

    const requestedTotal = guests.am + guests.af + guests.km + guests.kf;
    
    // Basic check
    if (booked.total + requestedTotal > capacity.total) return false;
    
    return true;
  },

  async getAvailableSlots(date: string, guests: { am: number, af: number, km: number, kf: number }) {
    const timeSlots = [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
      "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", 
      "19:00", "19:30", "20:00", "20:30", "21:00"
    ];

    const availableSlots: string[] = [];
    
    // Get all reservations for the date once to optimize
    const q = query(collection(db, 'reservations'), 
      where('date', '==', date),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const snapshot = await getDocs(q);
    const dayReservations = snapshot.docs.map(doc => doc.data() as Reservation);

    // Get rooms once
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    const rooms = roomsSnapshot.docs.map(doc => doc.data() as Room);
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);

    // If no rooms are configured, we can't accurately check capacity.
    // For a better UX during initial setup, we'll return all slots if capacity is 0
    // but in a real scenario, we should ensure rooms are seeded.
    if (totalCapacity === 0) return timeSlots;

    const requestedTotal = guests.am + guests.af + guests.km + guests.kf;

    for (const slot of timeSlots) {
      const slotBookings = dayReservations.filter(r => r.time === slot);
      const bookedCount = slotBookings.reduce((acc, r) => 
        acc + r.adultsMale + r.adultsFemale + r.kidsMale + r.kidsFemale, 0
      );

      if (bookedCount + requestedTotal <= totalCapacity) {
        availableSlots.push(slot);
      }
    }

    return availableSlots;
  }
};

export interface Bed {
  id: string;
  label: string;
  status: 'empty' | 'occupied' | 'cleaning';
  reservationId?: string;
  customerName?: string;
}

export interface Room {
  id: string;
  floor: number;
  type: 'male' | 'female' | 'private' | 'group';
  capacity: number;
  roomNumber: string;
  occupiedBeds: number;
  beds?: Bed[];
}

export const roomService = {
  async getRooms() {
    const snapshot = await getDocs(collection(db, 'rooms'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  },

  subscribeToRooms(callback: (rooms: Room[]) => void) {
    return onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      callback(rooms);
    });
  },

  async updateRoomOccupancy(roomId: string, occupiedBeds: number) {
    const ref = doc(db, 'rooms', roomId);
    return await updateDoc(ref, { occupiedBeds });
  },

  async seedInitialRooms() {
    const initialRooms: Omit<Room, 'id'>[] = [
      { roomNumber: '101', floor: 1, type: 'male', capacity: 4, occupiedBeds: 0 },
      { roomNumber: '102', floor: 1, type: 'female', capacity: 4, occupiedBeds: 0 },
      { roomNumber: '201', floor: 2, type: 'private', capacity: 2, occupiedBeds: 0 },
      { roomNumber: '301', floor: 3, type: 'group', capacity: 6, occupiedBeds: 0 },
      { roomNumber: '302', floor: 3, type: 'male', capacity: 4, occupiedBeds: 0 },
      { roomNumber: '303', floor: 3, type: 'female', capacity: 4, occupiedBeds: 0 },
    ];

    for (const room of initialRooms) {
      await addDoc(collection(db, 'rooms'), room);
    }
  }
};

import React, { useState, useEffect, useRef } from 'react';
import { Reservation, reservationService, roomService, Room } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Car, CheckCircle2, Clock, MapPin, Phone, User, XCircle, Info, Camera, Trash2, Bed as BedIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AdminDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicleForm, setVehicleForm] = useState({
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    vehicleImage: '',
    dispatchTime: '',
  });

  useEffect(() => {
    const unsubRes = reservationService.subscribeToAllReservations(setReservations);
    const unsubRooms = roomService.subscribeToRooms(setRooms);
    return () => {
      unsubRes();
      unsubRooms();
    };
  }, []);

  const handleStatusChange = async (id: string, status: Reservation['status']) => {
    try {
      await reservationService.updateReservation(id, { status });
      toast.success(`Reservation ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const seedRooms = async () => {
    try {
      await roomService.seedInitialRooms();
      toast.success('Rooms seeded successfully');
    } catch (error) {
      toast.error('Failed to seed rooms');
    }
  };

  const handleRoomAssignment = async (resId: string, roomId: string | undefined) => {
    try {
      // 1. Update reservation
      await reservationService.updateReservation(resId, { assignedRoomId: roomId });
      
      // 2. Update room occupancy for all rooms (simplified)
      for (const room of rooms) {
        const count = reservations.filter(r => 
          (r.id === resId ? roomId === room.id : r.assignedRoomId === room.id) && 
          (r.status === 'confirmed' || r.status === 'pending')
        ).length;
        
        if (room.occupiedBeds !== count) {
          await roomService.updateRoomOccupancy(room.id, count);
        }
      }
      
      toast.success('Room assignment updated');
    } catch (error) {
      toast.error('Failed to update room assignment');
    }
  };

  const handleDispatch = async () => {
    if (!selectedRes?.id) return;
    try {
      await reservationService.updateReservation(selectedRes.id, {
        vehicleInfo: vehicleForm,
        status: 'confirmed'
      });
      toast.success('Vehicle dispatched and reservation confirmed');
      setSelectedRes(null);
    } catch (error) {
      toast.error('Failed to dispatch vehicle');
    }
  };

  const openDispatchDialog = (res: Reservation) => {
    setSelectedRes(res);
    setVehicleForm({
      driverName: res.vehicleInfo?.driverName || '',
      driverPhone: res.vehicleInfo?.driverPhone || '',
      vehicleNumber: res.vehicleInfo?.vehicleNumber || '',
      vehicleImage: res.vehicleInfo?.vehicleImage || '',
      dispatchTime: res.vehicleInfo?.dispatchTime || format(new Date(), 'HH:mm'),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Firestore base64
      toast.error('Image is too large. Please use a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVehicleForm({ ...vehicleForm, vehicleImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const getRoomBeds = (room: Room) => {
    // Find reservations assigned to this room that are confirmed or checked-in
    const roomReservations = reservations.filter(r => 
      r.assignedRoomId === room.id && 
      (r.status === 'confirmed' || r.status === 'pending')
    );
    
    // Create a virtual bed layout based on capacity
    const beds = Array.from({ length: room.capacity }).map((_, idx) => {
      const res = roomReservations[idx];
      return {
        id: `bed-${idx}`,
        label: `Bed ${idx + 1}`,
        status: res ? 'occupied' : 'empty' as const,
        reservationId: res?.id,
        customerName: res?.customerName
      };
    });
    
    return beds;
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Management Center</h1>
          <p className="text-muted-foreground italic">Oversee operations and guest logistics with precision.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" onClick={seedRooms} className="text-xs">
            Seed Rooms
          </Button>
          <Card className="px-6 py-3 flex items-center gap-3 border-none shadow-sm bg-white">
            <div className="bg-orange-100 p-2 rounded-full">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{reservations.filter(r => r.status === 'pending').length}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Pending</span>
            </div>
          </Card>
          <Card className="px-6 py-3 flex items-center gap-3 border-none shadow-sm bg-white">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{reservations.filter(r => r.status === 'confirmed').length}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Confirmed</span>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="reservations" className="space-y-8">
        <TabsList className="bg-white/50 p-1 border">
          <TabsTrigger value="reservations" className="data-[state=active]:bg-primary data-[state=active]:text-white">Reservations</TabsTrigger>
          <TabsTrigger value="rooms" className="data-[state=active]:bg-primary data-[state=active]:text-white">Room Occupancy</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-4">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-1 bg-primary w-full" />
            <CardHeader className="bg-white">
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{res.customerName}</span>
                          <span className="text-xs text-muted-foreground">{res.customerPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{res.date}</span>
                          <span className="text-xs text-muted-foreground">{res.time}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {res.adultsMale + res.adultsFemale}A / {res.kidsMale + res.kidsFemale}K
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{res.courseId.replace('-', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={
                          res.status === 'confirmed' ? 'default' : 
                          res.status === 'pending' ? 'secondary' : 
                          res.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {res.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={res.assignedRoomId || 'unassigned'} 
                          onValueChange={(val) => handleRoomAssignment(res.id!, val === 'unassigned' ? undefined : val)}
                        >
                          <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {rooms.map(room => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.roomNumber} ({room.occupiedBeds}/{room.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {res.vehicleInfo?.driverName ? (
                          <div className="flex items-center gap-2">
                            {res.vehicleInfo.vehicleImage && (
                              <img 
                                src={res.vehicleInfo.vehicleImage} 
                                alt="Vehicle" 
                                className="h-8 w-8 rounded object-cover border"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex flex-col text-xs">
                              <div className="flex items-center gap-1 text-green-600 font-medium">
                                <Car className="h-3 w-3" />
                                <span>{res.vehicleInfo.vehicleNumber}</span>
                              </div>
                              <span className="text-muted-foreground">{res.vehicleInfo.driverName}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No vehicle</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openDispatchDialog(res)} title="Dispatch Vehicle">
                            <Car className="h-4 w-4" />
                          </Button>
                          {res.status === 'pending' && (
                            <Button size="icon" variant="ghost" onClick={() => handleStatusChange(res.id!, 'confirmed')} title="Confirm">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {res.status !== 'cancelled' && res.status !== 'completed' && (
                            <Button size="icon" variant="ghost" onClick={() => handleStatusChange(res.id!, 'cancelled')} title="Cancel">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rooms.length === 0 ? (
              <Card className="col-span-full p-12 text-center text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
                No rooms configured yet.
              </Card>
            ) : (
              rooms.map((room) => (
                <Card 
                  key={room.id} 
                  className="border-none shadow-lg overflow-hidden bg-white cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className={`h-1 w-full ${room.occupiedBeds >= room.capacity ? 'bg-red-500' : 'bg-primary'}`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      Room {room.roomNumber}
                      <Badge variant="outline" className="bg-gray-50">{room.floor}F</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize font-medium">{room.type}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-muted-foreground uppercase tracking-wider">Occupancy</span>
                          <span className={room.occupiedBeds >= room.capacity ? 'text-red-600' : 'text-primary'}>
                            {room.occupiedBeds} / {room.capacity}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${room.occupiedBeds >= room.capacity ? 'bg-red-500' : 'bg-primary'}`} 
                            style={{ width: `${(room.occupiedBeds / room.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRes} onOpenChange={(open) => !open && setSelectedRes(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vehicle Dispatch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driverName" className="text-right">Driver</Label>
              <Input 
                id="driverName" 
                value={vehicleForm.driverName} 
                onChange={(e) => setVehicleForm({...vehicleForm, driverName: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driverPhone" className="text-right">Phone</Label>
              <Input 
                id="driverPhone" 
                value={vehicleForm.driverPhone} 
                onChange={(e) => setVehicleForm({...vehicleForm, driverPhone: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vehicleNumber" className="text-right">Vehicle #</Label>
              <Input 
                id="vehicleNumber" 
                value={vehicleForm.vehicleNumber} 
                onChange={(e) => setVehicleForm({...vehicleForm, vehicleNumber: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Photo</Label>
              <div className="col-span-3 space-y-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {vehicleForm.vehicleImage ? (
                  <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-gray-50">
                    <img 
                      src={vehicleForm.vehicleImage} 
                      alt="Captured" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setVehicleForm({ ...vehicleForm, vehicleImage: '' })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-24 border-dashed flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Take a Photo</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dispatchTime" className="text-right">Time</Label>
              <Input 
                id="dispatchTime" 
                type="time"
                value={vehicleForm.dispatchTime} 
                onChange={(e) => setVehicleForm({...vehicleForm, dispatchTime: e.target.value})}
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDispatch}>Confirm Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BedIcon className="h-6 w-6 text-primary" />
              Room {selectedRoom?.roomNumber} - Bed Layout
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectedRoom && getRoomBeds(selectedRoom).map((bed, idx) => {
                const isOccupied = bed.status === 'occupied';
                
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-32",
                      isOccupied 
                        ? "border-primary bg-primary/5 shadow-inner" 
                        : "border-dashed border-gray-200 bg-gray-50/50"
                    )}
                  >
                    <BedIcon className={cn("h-8 w-8", isOccupied ? "text-primary" : "text-gray-300")} />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">{bed.label}</span>
                    
                    {isOccupied ? (
                      <div className="text-center w-full px-2">
                        <p className="text-sm font-bold text-primary truncate">
                          {bed.customerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Occupied</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Empty</span>
                    )}

                    {isOccupied && (
                      <div className="absolute top-2 right-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-dashed">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Room Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Floor:</span> {selectedRoom?.floor}F
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span> <span className="capitalize">{selectedRoom?.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Capacity:</span> {selectedRoom?.capacity} Beds
                </div>
                <div>
                  <span className="text-muted-foreground">Current Occupancy:</span> {selectedRoom?.occupiedBeds} Beds
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRoom(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

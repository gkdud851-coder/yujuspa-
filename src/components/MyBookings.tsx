import { useState, useEffect } from 'react';
import { Reservation, reservationService } from '@/lib/services';
import { useAuth } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Car, MapPin, Phone, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function MyBookings() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = reservationService.subscribeToUserReservations(user.uid, setReservations);
    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Please login to see your bookings</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Reservations</h1>
        <p className="text-muted-foreground">Track your spa booking and vehicle status in real-time.</p>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {reservations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-2xl border border-dashed"
            >
              <p className="text-muted-foreground">No reservations found.</p>
            </motion.div>
          ) : (
            reservations.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).map((res) => (
              <motion.div
                key={res.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="overflow-hidden border-none shadow-sm bg-white">
                  <div className="h-2 bg-primary" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{res.courseId.replace('-', ' ').toUpperCase()}</CardTitle>
                        <CardDescription>{res.date} at {res.time}</CardDescription>
                      </div>
                      <Badge variant={
                        res.status === 'confirmed' ? 'default' : 
                        res.status === 'pending' ? 'secondary' : 
                        res.status === 'completed' ? 'outline' : 'destructive'
                      } className="capitalize">
                        {res.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{res.adultsMale + res.adultsFemale} Adults, {res.kidsMale + res.kidsFemale} Kids</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-primary/60">Pickup</span>
                            <span>{res.noPickup ? 'Not needed' : res.pickupAddress}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-primary/60">Dropoff</span>
                            <span>{res.noDropoff ? 'Not needed' : res.dropoffAddress}</span>
                          </div>
                        </div>
                      </div>

                      {res.vehicleInfo && (
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-primary flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              Vehicle Dispatched
                            </h4>
                            <Badge variant="outline" className="bg-white">{res.vehicleInfo.vehicleNumber}</Badge>
                          </div>
                          
                          {res.vehicleInfo.vehicleImage && (
                            <div className="aspect-video rounded-lg overflow-hidden border bg-white">
                              <img 
                                src={res.vehicleInfo.vehicleImage} 
                                alt="Vehicle" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Driver</span>
                              <span className="font-medium">{res.vehicleInfo.driverName}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Contact</span>
                              <span className="font-medium">{res.vehicleInfo.driverPhone}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {res.status === 'pending' && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-xs">
                        <AlertCircle className="h-4 w-4" />
                        <span>Your booking is waiting for manager confirmation. We will dispatch a vehicle shortly.</span>
                      </div>
                    )}

                    {res.status === 'confirmed' && !res.vehicleInfo && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Booking confirmed! We are assigning a driver for your pickup.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Users, MapPin, Clock, CreditCard, Sparkles, User, Flower2, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reservationService } from '@/lib/services';
import { useAuth } from '@/lib/hooks';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Checkbox } from '@/components/ui/checkbox';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPicker } from './MapPicker';

const bookingSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().min(8, 'Phone is required'),
  adultsMale: z.number().min(0),
  adultsFemale: z.number().min(0),
  kidsMale: z.number().min(0),
  kidsFemale: z.number().min(0),
  courseId: z.enum(['vip-90', 'vip-120']),
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  noPickup: z.boolean(),
  noDropoff: z.boolean(),
  time: z.string().min(1, 'Time is required'),
}).refine((data) => data.noPickup || (data.pickupAddress && data.pickupAddress.length >= 5), {
  message: "Pickup address is required unless 'Not needed' is checked",
  path: ["pickupAddress"],
}).refine((data) => data.noDropoff || (data.dropoffAddress && data.dropoffAddress.length >= 5), {
  message: "Dropoff address is required unless 'Not needed' is checked",
  path: ["dropoffAddress"],
});

type BookingValues = z.infer<typeof bookingSchema>;

const PRICES = {
  'vip-90': { adult: 50000, kid: 30000 },
  'vip-120': { adult: 70000, kid: 50000 },
};

export function BookingForm() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<'pickup' | 'dropoff' | null>(null);

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      adultsMale: 0,
      adultsFemale: 0,
      kidsMale: 0,
      kidsFemale: 0,
      courseId: 'vip-90',
      pickupAddress: '',
      dropoffAddress: '',
      noPickup: false,
      noDropoff: false,
      time: '',
    },
  });

  const watchAll = form.watch();
  const totalPrice = 
    (watchAll.adultsMale + watchAll.adultsFemale) * PRICES[watchAll.courseId].adult +
    (watchAll.kidsMale + watchAll.kidsFemale) * PRICES[watchAll.courseId].kid;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!date) return;
      
      const totalGuests = watchAll.adultsMale + watchAll.adultsFemale + watchAll.kidsMale + watchAll.kidsFemale;
      if (totalGuests === 0) {
        setAvailableSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const slots = await reservationService.getAvailableSlots(
          format(date, 'yyyy-MM-dd'),
          { am: watchAll.adultsMale, af: watchAll.adultsFemale, km: watchAll.kidsMale, kf: watchAll.kidsFemale }
        );
        setAvailableSlots(slots);
        // Reset time if current time is not in new slots
        if (watchAll.time && !slots.includes(watchAll.time)) {
          form.setValue('time', '');
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch available times');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date, watchAll.adultsMale, watchAll.adultsFemale, watchAll.kidsMale, watchAll.kidsFemale]);

  const onSubmit = async (values: BookingValues) => {
    if (!user) {
      toast.error('Please login to book');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setIsSubmitting(true);
    try {
      const isAvailable = await reservationService.checkAvailability(
        format(date, 'yyyy-MM-dd'),
        values.time,
        { am: values.adultsMale, af: values.adultsFemale, km: values.kidsMale, kf: values.kidsFemale }
      );

      if (!isAvailable) {
        toast.error('Sorry, no beds available for the selected time.');
        return;
      }

      await reservationService.createReservation({
        ...values,
        pickupAddress: values.noPickup ? '' : (values.pickupAddress || ''),
        dropoffAddress: values.noDropoff ? '' : (values.dropoffAddress || ''),
        userId: user.uid,
        date: format(date, 'yyyy-MM-dd'),
        totalPrice,
      });
      toast.success('Reservation submitted successfully!');
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMap = (target: 'pickup' | 'dropoff') => {
    setMapTarget(target);
    setIsMapOpen(true);
  };

  const handleMapConfirm = (address: string) => {
    if (mapTarget === 'pickup') {
      form.setValue('pickupAddress', address);
    } else if (mapTarget === 'dropoff') {
      form.setValue('dropoffAddress', address);
    }
    setIsMapOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl mb-12">
          <img 
            src="https://picsum.photos/seed/phuquoc-spa/1200/600" 
            alt="Yuju Spa Phu Quoc" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">Yuju Spa Phu Quoc</h1>
            <p className="text-white/80 text-lg italic font-heading">The Ultimate Healing Experience in Paradise</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <User className="h-6 w-6 text-primary" />
                  Guest Details
                </CardTitle>
                <CardDescription>Enter the number of guests and contact info.</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name</Label>
                  <Input id="customerName" {...form.register('customerName')} placeholder="John Doe" />
                  {form.formState.errors.customerName && <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input id="customerPhone" {...form.register('customerPhone')} placeholder="+82 10-1234-5678" />
                  {form.formState.errors.customerPhone && <p className="text-xs text-destructive">{form.formState.errors.customerPhone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Adult (M)</Label>
                  <Input type="number" {...form.register('adultsMale', { valueAsNumber: true })} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Adult (F)</Label>
                  <Input type="number" {...form.register('adultsFemale', { valueAsNumber: true })} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Kids (M)</Label>
                  <Input type="number" {...form.register('kidsMale', { valueAsNumber: true })} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Kids (F)</Label>
                  <Input type="number" {...form.register('kidsFemale', { valueAsNumber: true })} min={0} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-primary" />
                Course & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Course</Label>
                <Select 
                  onValueChange={(val) => form.setValue('courseId', val as any)} 
                  defaultValue={form.getValues('courseId')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vip-90">VIP 90 min (Adult: 50k / Kid: 30k)</SelectItem>
                    <SelectItem value="vip-120">VIP 120 min (Adult: 70k / Kid: 50k)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <div className="p-1 border rounded-md bg-gray-50/50">
                    {isLoadingSlots ? (
                      <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
                        Finding available times...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="h-10 flex items-center justify-center text-xs text-muted-foreground italic">
                        {watchAll.adultsMale + watchAll.adultsFemale + watchAll.kidsMale + watchAll.kidsFemale === 0 
                          ? "Enter guest count first" 
                          : "No slots available for this date"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 p-1 max-h-40 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={watchAll.time === slot ? "default" : "outline"}
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => form.setValue('time', slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.formState.errors.time && <p className="text-xs text-destructive">{form.formState.errors.time.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPin className="h-6 w-6 text-primary" />
                Transport Details
              </CardTitle>
              <CardDescription>Free pickup/dropoff for VIP courses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Pickup</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="noPickup" 
                      checked={watchAll.noPickup}
                      onCheckedChange={(checked) => form.setValue('noPickup', checked as boolean)}
                    />
                    <label htmlFor="noPickup" className="text-xs text-muted-foreground cursor-pointer">Not needed</label>
                  </div>
                </div>
                {!watchAll.noPickup && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input {...form.register('pickupAddress')} placeholder="Hotel name or address" className="pr-10" />
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1 h-8 w-8 text-primary"
                        onClick={() => openMap('pickup')}
                      >
                        <MapIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.formState.errors.pickupAddress && <p className="text-xs text-destructive">{form.formState.errors.pickupAddress.message}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Dropoff</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="noDropoff" 
                      checked={watchAll.noDropoff}
                      onCheckedChange={(checked) => form.setValue('noDropoff', checked as boolean)}
                    />
                    <label htmlFor="noDropoff" className="text-xs text-muted-foreground cursor-pointer">Not needed</label>
                  </div>
                </div>
                {!watchAll.noDropoff && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input {...form.register('dropoffAddress')} placeholder="Where to after spa?" className="pr-10" />
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1 h-8 w-8 text-primary"
                        onClick={() => openMap('dropoff')}
                      >
                        <MapIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.formState.errors.dropoffAddress && <p className="text-xs text-destructive">{form.formState.errors.dropoffAddress.message}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Flower2 className="h-24 w-24 rotate-12" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="flex justify-between text-sm opacity-90">
                <span>Adults ({watchAll.adultsMale + watchAll.adultsFemale})</span>
                <span>{(watchAll.adultsMale + watchAll.adultsFemale) * PRICES[watchAll.courseId].adult} KRW</span>
              </div>
              <div className="flex justify-between text-sm opacity-90">
                <span>Kids ({watchAll.kidsMale + watchAll.kidsFemale})</span>
                <span>{(watchAll.kidsMale + watchAll.kidsFemale) * PRICES[watchAll.courseId].kid} KRW</span>
              </div>
              <div className="pt-4 border-t border-white/20 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>{totalPrice.toLocaleString()} KRW</span>
              </div>
            </CardContent>
            <CardFooter className="relative z-10">
              <Button className="w-full h-12 text-lg bg-white text-primary hover:bg-white/90" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Book Now'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
      </motion.div>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Select {mapTarget === 'pickup' ? 'Pickup' : 'Dropoff'} Location</DialogTitle>
          </DialogHeader>
          <div className="h-[500px] w-full">
            <MapPicker 
              onConfirm={handleMapConfirm} 
              initialAddress={mapTarget === 'pickup' ? form.getValues('pickupAddress') : form.getValues('dropoffAddress')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

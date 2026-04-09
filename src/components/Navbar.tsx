import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks';
import { Flower2, LogOut, User, LayoutDashboard, CalendarDays } from 'lucide-react';

interface NavbarProps {
  onViewChange: (view: 'booking' | 'admin' | 'my-bookings') => void;
  currentView: 'booking' | 'admin' | 'my-bookings';
}

export function Navbar({ onViewChange, currentView }: NavbarProps) {
  const { user, role } = useAuth();

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('booking')}>
            <div className="bg-primary p-2 rounded-lg">
              <Flower2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">Yuju Spa</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {role === 'admin' && (
                  <Button 
                    variant={currentView === 'admin' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => onViewChange('admin')}
                    className="gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                )}
                <Button 
                  variant={currentView === 'my-bookings' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => onViewChange('my-bookings')}
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden md:inline">My Bookings</span>
                </Button>
                <Button 
                  variant={currentView === 'booking' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => onViewChange('booking')}
                  className="gap-2"
                >
                  <Flower2 className="h-4 w-4" />
                  <span className="hidden md:inline">New Booking</span>
                </Button>
                
                <div className="flex items-center gap-2 pl-4 border-l">
                  <div className="flex flex-col items-end hidden md:flex">
                    <span className="text-xs font-medium">{user.displayName}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleLogin} className="gap-2">
                <User className="h-4 w-4" />
                Login with Google
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

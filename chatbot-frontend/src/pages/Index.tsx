
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  
  // Redirect based on authentication status
  if (user) {
    return <Navigate to="/" replace />;
  } else {
    return <Navigate to="/auth" replace />;
  }
};

export default Index;

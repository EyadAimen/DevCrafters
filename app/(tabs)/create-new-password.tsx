// app/create-new-password.tsx
import { useEffect } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import CreateNewPassword from '../../components/CreateNewPassword';

export default function CreateNewPasswordScreen() {
  const params = useGlobalSearchParams();

  useEffect(() => {
    console.log('🔄 CreateNewPassword screen opened with params:', params);
    console.log('🔄 CreateNewPassword screen opened with params:', params);
  }, [params]);

  return <CreateNewPassword />;
}
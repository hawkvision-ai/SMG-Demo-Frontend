import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SSOCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleSSOCallback = async () => {
      const toastId = toast.loading("Completing Microsoft sign in...");
      
      try {
        // Check for error parameter first
        const errorParam = searchParams.get('err');
        if (errorParam) {
          const decodedError = decodeURIComponent(errorParam.replace(/\+/g, ' '));
          throw new Error(decodedError);
        }

        // Extract parameters from URL
        const accessToken = searchParams.get('access_token');
        const tokenType = searchParams.get('token_type');
        const customerId = searchParams.get('customer_id');
        const name = searchParams.get('name');
        const customerName = searchParams.get('customer_name');
        const industry = searchParams.get('industry');
        const logo = searchParams.get('logo');
        const role = searchParams.get('role');
        const imageUrl = searchParams.get('image_url');
        const phone = searchParams.get('phone');
        const id = searchParams.get('id');
        const email = searchParams.get('email');
        const timezone = searchParams.get('timezone');

        // Validate required parameters
        if (!accessToken || !email || !id) {
          throw new Error('Missing required authentication parameters');
        }

        // Create user object matching your LoginResponse interface
        const userData = {
          access_token: accessToken,
          token_type: tokenType || 'bearer',
          customer_id: customerId || '',
          name: name ? decodeURIComponent(name.replace(/\+/g, ' ')) : '',
          customer_name: customerName ? decodeURIComponent(customerName.replace(/\+/g, ' ')) : '',
          industry: industry || '',
          logo: logo ? decodeURIComponent(logo) : '',
          role: role || '',
          image_url: imageUrl && imageUrl !== 'None' ? decodeURIComponent(imageUrl) : null,
          phone: phone || '',
          id: id,
          email: decodeURIComponent(email),
          timezone: timezone || ''
        };

        // Store authentication data
        localStorage.setItem("authToken", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Set user in context
        setUser(userData);

        // Show success message
        toast.success("Successfully signed in with Microsoft!", { id: toastId });

        // Navigate to the same destination as regular login
        // Based on your AuthPage component, it navigates to "/configure" after login
        navigate("/configure", { replace: true });

      } catch (error) {
        console.error('SSO Callback Error:', error);
        const errorMessage = error instanceof Error ? error.message : "Authentication failed";
        toast.error(errorMessage, { id: toastId });
        
        // Clear URL parameters and show regular login form
        navigate("/login", { replace: true });
      }
    };

    // Run if we have either access_token (success) or err (error) parameters
    if (searchParams.get('access_token') || searchParams.get('err')) {
      handleSSOCallback();
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <Loader className="h-8 w-8 animate-spin text-teal-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          Completing sign in...
        </h2>
        <p className="text-gray-600 max-w-sm">
          Please wait while we complete your Microsoft authentication and sign you in.
        </p>
      </div>
    </div>
  );
}
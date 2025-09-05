import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const RegisterMachinePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gradient-orange text-center">Register New Machine</h1>
          <p className="text-gray-400 text-center">This page is under construction.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterMachinePage;
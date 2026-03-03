import Spline from '@splinetool/react-spline';

export default function Hero() {
  return (
    <header className="relative h-screen w-full overflow-hidden bg-[#121212]">
      {/* The Spline Scene acts as the atmospheric background */}
      <div className="absolute inset-0 z-0">
        <Spline scene="https://prod.spline.design/4tuh3W7pu-zpL4Bp/scene.splinecode" />
      </div>
      
      {/* Content Overlay */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl md:text-7xl font-serif text-[#F9F9F7] mb-6">
          The Future of Legal Onboarding
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl">
          Meet your Automated Compliance Assistant. Secure, live AML verification tailored for London's leading law firms.
        </p>
        <div className="flex space-x-4">
          <button className="px-8 py-3 bg-[#1976d2] text-white font-semibold rounded-lg hover:bg-[#1565c0] transition-colors">
            Start Live Demo
          </button>
          <button className="px-8 py-3 bg-transparent border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-[#121212] transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </header>
  );
}

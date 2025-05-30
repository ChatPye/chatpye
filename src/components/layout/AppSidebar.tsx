"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, Users, BarChartBig, ShieldCheck } from "lucide-react";
import Link from 'next/link'; // Using Next.js Link for client-side navigation if needed

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, isOpen }) => {
  return (
    <li>
      <Link href={href} legacyBehavior>
        <a className="flex items-center p-2 space-x-3 rounded-md hover:bg-gray-700 transition-colors duration-150">
          {icon}
          {isOpen && <span className="ml-2 whitespace-nowrap">{label}</span>}
        </a>
      </Link>
    </li>
  );
};

const AppSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  // Consider making sidebar hidden by default on mobile and then user can open it.
  // For now, let's make it collapsed by default on screens smaller than md.
  // This would require checking screen size, or a CSS media query driven approach.
  // Simpler: Use Tailwind's responsive prefixes for default state.
  // Let's start with it open by default on larger screens and collapsed on smaller ones.
  // This is tricky with a single `isOpen` state.
  // A common pattern is to have it always collapsed on mobile, and the toggle makes it an overlay.
  // For this iteration, we'll keep its current behavior (user toggled) but adjust padding/icon sizes.

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Adjusted icon sizes based on isOpen state for a bit more refinement
  const navItems = [
    { href: "#", icon: <Activity size={isOpen ? 22 : 24} />, label: "Activities" }, 
    { href: "#", icon: <Users size={isOpen ? 22 : 24} />, label: "Agents" },
    { href: "#", icon: <BarChartBig size={isOpen ? 22 : 24} />, label: "Analytics" },
  ];

  return (
    // Adjusted padding and widths for smaller screens
    <div 
      className={`flex flex-col h-screen p-2 sm:p-3 bg-gray-800 text-white shadow-lg transition-all duration-300 ease-in-out ${isOpen ? 'w-56 sm:w-60' : 'w-16 sm:w-[76px]'}`}
    >
      {/* Toggle Button - reduced padding for the button itself */}
      <div className={`flex mb-3 sm:mb-4 ${isOpen ? 'justify-end' : 'justify-center'}`}>
        <Button 
          onClick={toggleSidebar} 
          variant="ghost" 
          className="text-white hover:bg-gray-700 p-1.5 sm:p-2" // Reduced padding
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />} {/* Smaller toggle icon */}
        </Button>
      </div>
      
      {/* Navigation Links - reduced spacing for list items */}
      <nav className="flex-grow">
        <ul className="space-y-1.5 sm:space-y-2"> 
          {navItems.map((item) => (
            <NavItem 
              key={item.label} 
              href={item.href}
              icon={item.icon} // Pass the icon directly, size is handled in navItems definition
              label={item.label}
              isOpen={isOpen} 
            />
          ))}
        </ul>
      </nav>

      {/* Upgrade Plan Button - reduced padding and text size */}
      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-700">
        <Link href="#" legacyBehavior>
          <a 
            className={`flex items-center p-1.5 sm:p-2 space-x-2 sm:space-x-3 rounded-md transition-colors duration-150 ${isOpen ? 'hover:bg-gray-700' : 'justify-center hover:bg-gray-700'}`}
          >
            <ShieldCheck size={isOpen ? 22 : 24} /> {/* Icon size adjusted */}
            {isOpen && <span className="ml-1 sm:ml-2 text-sm sm:text-base whitespace-nowrap">Upgrade Plan</span>} {/* Adjusted text size and margin */}
          </a>
        </Link>
      </div>
    </div>
  );
};

export default AppSidebar;

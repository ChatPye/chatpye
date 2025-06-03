"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Activity, Users, BarChartBig, ShieldCheck, Menu } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

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

const CollapsibleSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsOpen(false); // Start collapsed on mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    { href: "#", icon: <Activity size={isOpen ? 22 : 24} />, label: "Activities" },
    { href: "#", icon: <Users size={isOpen ? 22 : 24} />, label: "Agents" },
    { href: "#", icon: <BarChartBig size={isOpen ? 22 : 24} />, label: "Analytics" },
  ];

  return (
    <>
      {/* Mobile Menu Button - Always visible on mobile */}
      {isMobile && !isOpen && (
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          className="fixed top-3 left-3 z-50 bg-gray-800 text-white hover:bg-gray-700 p-1.5 rounded-md shadow-lg"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </Button>
      )}

      {/* Overlay for mobile when sidebar is open */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-screen bg-gray-800 text-white shadow-lg transition-all duration-300 ease-in-out z-50",
          isMobile ? "w-64" : isOpen ? "w-60" : "w-16",
          isMobile && !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-2 sm:p-3">
          {/* Toggle Button */}
          <div className={cn("flex mb-3 sm:mb-4", isOpen ? "justify-end" : "justify-center")}>
            <Button 
              onClick={toggleSidebar} 
              variant="ghost" 
              className="text-white hover:bg-gray-700 p-1.5 sm:p-2"
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </Button>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-grow">
            <ul className="space-y-1.5 sm:space-y-2">
              {navItems.map((item) => (
                <NavItem 
                  key={item.label} 
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isOpen={isOpen} 
                />
              ))}
            </ul>
          </nav>

          {/* Upgrade Plan Button */}
          <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-700">
            <Link href="#" legacyBehavior>
              <a 
                className={cn(
                  "flex items-center p-1.5 sm:p-2 space-x-2 sm:space-x-3 rounded-md transition-colors duration-150",
                  isOpen ? "hover:bg-gray-700" : "justify-center hover:bg-gray-700"
                )}
              >
                <ShieldCheck size={isOpen ? 22 : 24} />
                {isOpen && <span className="ml-1 sm:ml-2 text-sm sm:text-base whitespace-nowrap">Upgrade Plan</span>}
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content spacer - only on desktop */}
      {!isMobile && (
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "w-60" : "w-16"
        )} />
      )}
    </>
  );
};

export default CollapsibleSidebar; 
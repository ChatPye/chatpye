import Image from "next/image"

export function Logo() {
  return (
    <div className="flex items-center">
      <Image
        src="/favicon.ico"
        alt="ChatPye Logo"
        width={32}
        height={32}
        className="h-7 w-7 sm:h-8 sm:w-8"
      />
      <span className="ml-2 text-lg sm:text-xl font-bold text-black">ChatPye</span>
    </div>
  )
} 
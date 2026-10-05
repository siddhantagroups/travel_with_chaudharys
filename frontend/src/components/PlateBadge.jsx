import React from 'react';

/*
  A vehicle's number plate, styled as an Indian commercial (yellow) plate with
  the blue "IND" strip — every vehicle in this fleet is a transport vehicle.
  Shared by My Fleet and Vehicle Documents so the two always match.

  Text steps down a size on the narrowest phones so the plate still shares a
  row with the buttons beside it in the narrow details column.
*/
export default function PlateBadge({ plate }) {
  return (
    <h3 className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-slate-900 bg-[#F9D342] shadow-sm">
      <span className="flex w-3 shrink-0 flex-col items-center justify-end bg-[#1D4ED8] pb-0.5 md:w-4" aria-hidden="true">
        <span className="text-[5px] font-bold leading-none text-white md:text-[6px]">IND</span>
      </span>
      <span className="px-1 py-0.5 font-mono text-xs font-extrabold tracking-tight text-slate-900 min-[375px]:text-sm sm:px-2 sm:text-base md:text-xl">
        {plate}
      </span>
    </h3>
  );
}

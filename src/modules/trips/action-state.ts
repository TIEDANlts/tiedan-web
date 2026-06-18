export type TripActionState = {
  ok: boolean;
  message: string | null;
  tripId?: string;
  errors?: Partial<Record<"title" | "startDate" | "endDate" | "destinations" | "coverUrl" | "status" | "budget" | "form", string>>;
};

export const initialTripActionState: TripActionState = {
  ok: false,
  message: null,
};

/** Fehler mit HTTP-Status und deutschem Text. Route-Handler machen daraus `{ error }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

import {
    $update,
    $query,
    Record,
    StableBTreeMap,
    match,
    Result,
    nat32,
    nat64,
    ic,
    Vec,
    float32,
    Opt,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  type ApplicationPayload = Record<{
    principal: nat32;
    duration: nat32;
  }>;
  
  type Application = Record<{
    id: string;
    principal: nat32;
    duration: nat32;
    interest_rate: float32;
    interest: float32;
    total_amount: float32;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
    current_status: string;
  }>;
  
  type ErrorVariant = Record<{
    NotFound: string;
    InvalidPayload: string;
  }>;
  
  const applicationStorage = new StableBTreeMap<string, Application>(0, 44, 1024);
  
  $update
  // Calculate the interest and total amount based on the provided payload
  export function calculateAmount(payload: ApplicationPayload): Result<string, string> {
    try {
      // Validate payload
      if (!payload || payload.principal <= 0 || payload.duration <= 0) {
        return Result.Err<string, string>("Invalid payload provided.");
      }
  
      const interest = payload.principal * 0.02 * (payload.duration / 12);
      const totalAmount = payload.principal + interest;
  
      return Result.Ok(
        `The interest is '${interest}' and the total amount to be paid is '${totalAmount}'`
      );
    } catch (error) {
      return Result.Err<string, string>(`Error calculating amount: ${error}`);
    }
  }
  
  $update
  // Add a new loan application based on the provided payload
  export function addApplication(payload: ApplicationPayload): Result<string, string> {
    try {
      // Validate payload
      if (!payload || payload.principal <= 0 || payload.duration <= 0) {
        return Result.Err<string, string>("Invalid payload provided.");
      }
  
      const interestCalculated = payload.principal * 0.02 * (payload.duration / 12);
      const totalCalculated = payload.principal + interestCalculated;
  
      // Create a new application
      const application: Application = {
        id: uuidv4(),
        interest_rate: 0.02,
        interest: interestCalculated,
        total_amount: totalCalculated,
        createdAt: ic.time(),
        updatedAt: Opt.None,
        ...payload,
        current_status: "pending",
      };
  
      // Insert the application into storage
      applicationStorage.insert(application.id, application);
  
      return Result.Ok(
        `Your application with ID ${application.id} for a principal amount of ${application.principal} and duration of ${application.duration} months has been received successfully!`
      );
    } catch (error) {
      return Result.Err<string, string>(`Error adding application: ${error}`);
    }
  }
  
  $query
  // Retrieve all loan applications
  export function getAllApplications(): Result<Vec<Application>, string> {
    try {
      // Return all applications
      return Result.Ok(applicationStorage.values());
    } catch (error) {
      return Result.Err(`Error retrieving applications: ${error}`);
    }
  }
  
  $query
  // Retrieve a specific loan application by ID
  export function getSpecificApplication(id: string): Result<Application, string> {
    // Validate ID
    if (!id) {
      return Result.Err<Application, string>("Invalid ID provided.");
    }
    try {
      return match(applicationStorage.get(id), {
        Some: (application) => Result.Ok<Application, string>(application),
        None: () => Result.Err<Application, string>(`The application with ID ${id} is not found`),
      });
    } catch (error) {
      return Result.Err(`Error retrieving applications: ${error}`);
    }
  }
  
  $update
  // Update an existing loan application based on ID and payload
  export function updateApplication(
    id: string,
    payload: ApplicationPayload
  ): Result<string, string> {
    return match(applicationStorage.get(id), {
      Some: (application) => {
        try {
          // Validate payload
          if (!payload || payload.principal <= 0 || payload.duration <= 0) {
            return Result.Err<string, string>("Invalid payload provided.");
          }
  
          const interestCalculated = payload.principal * 0.02 * (payload.duration / 12);
          const totalCalculated = payload.principal + interestCalculated;
  
          // Update existing application
          const updatedApplication: Application = {
            ...application,
            ...payload,
            interest: interestCalculated,
            total_amount: totalCalculated,
            updatedAt: Opt.Some(ic.time()),
          };
  
          // Insert the updated application into storage
          applicationStorage.insert(application.id, updatedApplication);
  
          return Result.Ok<string, string>(
            `You have updated an application with ID ${id} to have a principal amount of ${payload.principal} and duration of ${payload.duration} months`
          );
        } catch (error) {
          return Result.Err<string, string>(`Error updating application: ${error}`);
        }
      },
      None: () => Result.Err<string, string>(`The application with ID ${id} is not found`),
    });
  }
  
  $update
  // Delete an existing loan application based on ID
  export function deleteApplication(id: string): Result<string, string> {
    // Validate ID
    if (!id) {
      return Result.Err<string, string>("Invalid ID provided.");
    }
    try {
      return match(applicationStorage.remove(id), {
        Some: (_) => Result.Ok<string, string>(`You have deleted an application with ID ${id}`),
        None: () => Result.Err<string, string>(`The application with ID ${id} is not found`),
      });
    } catch (error) {
      return Result.Err(`Error retrieving applications: ${error}`);
    }
  }
  
  // Function to allow the use of uuid
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
  
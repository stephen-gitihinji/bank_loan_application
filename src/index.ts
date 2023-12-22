import {
    Canister,
    float32,
    int16,
    nat,
    nat16,
    Variant,
    nat32,
    query,
    Record,
    Result,
    StableBTreeMap,
    text,
    update,
    Void,
    ic,
    None,
    Ok,
    Opt,
    nat64,
    Vec,
    Err,
    Some,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

// Defining the application payload from the user
let applicationPayload = Record({
    principal: nat32,
    duration: nat32,
});

// Model for the application storage
let Application = Record({
    id: text,
    principal: nat32,
    duration: nat16,
    interest_rate: float32,
    interest: float32,
    total_amount: float32,
    createdAt: nat64,
    updatedAt: Opt(nat64),
    current_status: text,
});

// Defining the error message
const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});

// Defining a global interest rate
const rate: float32 = 0.02;

// Defining the storage of the application
const application_storage = StableBTreeMap(text, Application, 0);

// Defining the canister functions
export default Canister({
    // The simple interest calculator to get to know the interest and the amount to be paid.
    calculateAmount: query([applicationPayload], text, (payload) => {
        let interest: float32 = payload.principal * rate * (payload.duration / 12);
        let totalAmount = payload.principal + interest;
        return `The interest is '${interest}' and the total amount to be paid is '${totalAmount}'`;
    }),

    // Making a loan application
    addApplication: update([applicationPayload], Result(text, Error), (payload) => {
        let interest_calculated: float32 = payload.principal * rate * (payload.duration / 12);
        let total_calculated: float32 = payload.principal + interest_calculated;
        let application = {
            id: uuidv4(),
            interest_rate: rate,
            interest: interest_calculated,
            total_amount: total_calculated,
            createdAt: ic.time(),
            updatedAt: None,
            ...payload,
        };
        // Inserting the new application to the storage
        application_storage.insert(application.id, application);
        return Ok(`Your application with ID ${application.id} for a principal amount of ${application.principal} and duration of ${application.duration} months has been received successfully!`);
    }),

    // Retrieving all the applications
    getAllApplications: query([], Result(Vec(Application), Error), () => {
        return Ok(application_storage.values());
    }),

    // Retrieving a specific application
    getSpecificApplication: query([text], Result(Application, Error), (id) => {
        const application_option = application_storage.get(id);
        if ("None" in application_option) {
            return Err({ NotFound: `The application with ID ${id} is not found` });
        }
        return Ok(application_option.Some);
    }),

    // Updating an application
    updateApplication: update([text, applicationPayload], Result(text, Error), (id, payload) => {
        const application_option = application_storage.get(id);
        if ("None" in application_option) {
            return Err({ NotFound: `The application with ID ${id} is not found` });
        }
        const application = application_option.Some;
        application.interest = payload.principal * rate * (payload.duration / 12);
        application.total_amount = payload.principal + application.interest;
        const updated_application = { ...application, ...payload, updatedAt: Some(ic.time()) };
        application_storage.insert(application.id, updated_application);
        return Ok(`You have updated an application with ID ${id} to have a principal amount of ${payload.principal} and duration of ${payload.duration} months`);
    }),

    // Deleting an application
    deleteApplication: update([text], Result(text, Error), (id) => {
        const application_option = application_storage.remove(id);
        if ("None" in application_option) {
            return Err({ NotFound: `The application with ID ${id} is not found` });
        }
        return Ok(`You have deleted an application with ID ${id}`);
    }),
});

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

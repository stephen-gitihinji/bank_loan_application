import { Canister, float32, int16, nat, nat16,Variant, nat32, query, Record, Result, StableBTreeMap, text, update, Void, ic, None, Ok, Opt, nat64, Vec, Err, Some} from 'azle';
import { v4 as uuidv4 } from 'uuid';

// This is a global variable that is stored on the heap
//defining the application payload from the user
let applicationPayload = Record({
    principal: nat32,
    duration: nat32,
})
//model for the application storage
let Application = Record({
    id: text,
    principal: nat32,
    duration: nat16,
    interest_rate: float32,
    interest: float32,
    total_amount:float32,
    createdAt: nat64,
    updatedAt: Opt(nat64),
})
//defining the error message
const Error = Variant ({
    NotFound: text,
    InvalidPayload: text,
})
//defining a global interest rate
const rate:float32 = 0.02;
//defining the storage of the application
const application_storage = StableBTreeMap(text, Application, 0);

//defining the canister functions
export default Canister({
    // The simple interest calculator to get to know the interest and the amount to be paid.
    calculateAmount: query([applicationPayload], text , (payload)=>{
        let rate: float32 = 0.02;
        let interest: float32 = payload.principal * rate * (payload.duration/12);
        let totalAmount = payload.principal + interest;
        return "The interest  is '" + interest + "' and the total amount to be paid is '" + totalAmount +"'";;
    }),

    //making a loan application
    addApplication: update([applicationPayload], Result(Application, Error),(payload)=>{
        let interest_calculated: float32 = payload.principal *rate* (payload.duration/12);
        let total_calculated: float32 = payload.principal + interest_calculated;
        let application = {id: uuidv4(), interest_rate: rate, interest:interest_calculated,total_amount:total_calculated, createdAt: ic.time(), updatedAt: None, ...payload,};
        //inserting the new application to the storage
        application_storage.insert(application.id, application);
        // return Ok(`Your loan application of ${payload.principal} for a duration of ${payload.duration} month(s) has been received successfully`);
        return Ok(application);
    }),

    //retrieving all the applications:
    getAllApplications: query([], Result(Vec(Application), Error),()=>{
        return Ok(application_storage.values());
    }),

    //retrieving a specific application
    getSpecificApplication: query([text], Result(Application, Error), (id)=>{
        const application_option = application_storage.get(id);
        if ("None" in application_option) {
            return Err({ NotFound: `the application with id=${id}. not found` });
        }
        return Ok(application_option.Some);
    }),

    //updating an application
    updateApplication: update([text, applicationPayload], Result(text, Error), (id, payload)=>{
        const application_option = application_storage.get(id);
        if ("None" in application_option) {
            return Err({ NotFound: `the application with id=${id}. not found` });
        }
        const application = application_option.Some;
        application. interest = payload.principal * rate * (payload.duration/12);
        application.total_amount = payload.principal + application.interest;
        const updated_application = {...application, ...payload, updatedAt: Some(ic.time())};
        application_storage.insert(application.id, updated_application);
        return Ok(`You have updated an application of id:${id} to have an amount of ${payload.principal} and a duration of ${payload.duration} month(s)`);
    }),

    //deleting an application
    deleteApplication: update([text], Result(text, Error), (id)=>{
        const application_option = application_storage.remove(id);
        if ("None" in application_option) {
            return Err({ NotFound: `the application with id=${id}. not found` });
        }
        return Ok(`You have deleted an application of id:${id}`);
    })
});

//function to allow the use of uuid
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};

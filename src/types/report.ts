import { Job, Customer } from './index';

export interface FormReportProps {
    job: Job;
    customer: Customer | null | undefined;
    onSubmit: (report: ReportState) => void;
    onCancel: () => void;
    initialData?: ReportState;
    readOnly?: boolean;
}

export interface ReportState {
    tester: string;
    date: string;
    machineMake: string;
    plantType: string;
    noUnits: string;

    installation: {
        mainAirline: { bore: string; materials: string; slope: string; size: string; location: string };
        pulsatorAirlines: { bore: string; materials: string; slope: string; size: string; location: string };
        milkline: { bore: string; materials: string; height: string; slope: string; size: string; location: string };
        washline: { bore: string; materials: string; slope: string; size: string; location: string };
        milkLift: { bore: string; materials: string; height: string };
        milkPump: { make: string; highSpeed: boolean; rate: string };
        vacuumPump: { make: string; type: string; location: string; capacity: string };
        regulator: { make: string; type: string; location: string; gauge: string };
        claws: { make: string; type: string; volume: string; weight: string };
        liners: { make: string; type: string; shell: string };
    };

    maintenance: {
        vPumpOil: string;
        vPumpBelts: string;
        mPumpBelts: string;
        milkPumpDiaphragm: string;
        liners: string;
        milkTubes: string;
        pulseTubes: string;
        relayDiaphragms: string;
        pulsatorsClean: string;
    };

    airFlow: {
        t1_operatingVacuum: string;
        t1_recommended: string;
        t2_pumpCapacity: string;
        t2_rpm: string;
        t2_requiredCapacity: string;
        t3_afmAtTestPoint: string;
        t3_airPipelineLeakage: string;
        t4_addMilkingSystem: string;
        t4_systemLeakage: string;
        t5_openAirAdmission: string;
        t5_clawAdmission: string;
        t6_addPulsators: string;
        t6_pulsationUse: string;
        t6a_addAncillary: string;
        t6a_ancillaryUse: string;
        t7_dropVacuum2kPa: string;
        t7_regulatorLeakage: string;
        t8_addRegulator: string;
        t8_requiredReserve: string;
    };

    pulsation: {
        individual: PulsationGridRow;
        master: PulsationGridRow;
        relays: PulsationGridRow;
        graphsAttached: boolean;
        beltGuardsFitted: boolean;
    };

    faults: {
        installation: { faults: string; recommendations: string };
        maintenance: { faults: string; recommendations: string };
        vacuumTests: { faults: string; recommendations: string };
        pulsationTests: { faults: string; recommendations: string };
        safety: { faults: string; recommendations: string };
        other: { faults: string; recommendations: string };
    };
}

export interface PulsationGridRow {
    no: string;
    make: string;
    type: string;
    units: string;
    ratio: string;
    rate: string;
    a: string;
    d: string;
    max: string;
    min: string;
    diff: string;
}

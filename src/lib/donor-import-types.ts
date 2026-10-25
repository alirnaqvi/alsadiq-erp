export type ImportRow = {
  row: number;
  sheet: string;
  membershipNo: string | null;
  fullName: string;
  mobile: string;
  amount: number;
  profession: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  city: string | null;
  address: string | null;
  cnic: string | null;
  email: string | null;
  issues: string[];
};

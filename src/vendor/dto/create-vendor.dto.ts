import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateVendorDto {
  @IsNotEmpty()
  @IsString()
  name: string = 'Example Vendor';  // Default value

  @IsNotEmpty()
  @IsEmail()
  email: string = 'vendor@example.com';  // Default value

  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, { message: 'Phone number must be 10-15 digits' })
  phoneNumber: string = '1234567890';  // Default value (10-15 digits)

  @IsNotEmpty()
  @IsString()
  address: string = '123 Vendor St, Business City, BC 12345';  // Default value
}

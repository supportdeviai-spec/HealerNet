<?php

namespace App\Http\Requests;

use App\Enums\Status;
use App\Models\City;
use App\Models\Country;
use App\Models\Region;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RegisterLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'region_id' => ['required', 'integer', 'exists:regions,id'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $countryId = $this->input('country_id');
            $regionId = $this->input('region_id');
            $cityId = $this->input('city_id');

            if (!$countryId || !$regionId || !$cityId) {
                return;
            }

            $countryActive = Country::where('id', $countryId)->active()->exists();
            if (!$countryActive) {
                $validator->errors()->add('country_id', 'The selected country is not active.');
            }

            $regionValid = Region::where('id', $regionId)
                ->where('country_id', $countryId)
                ->active()
                ->exists();

            if (!$regionValid) {
                $validator->errors()->add('region_id', 'The selected region does not belong to the selected country or is inactive.');
            }

            $cityValid = City::where('id', $cityId)
                ->where('region_id', $regionId)
                ->active()
                ->exists();

            if (!$cityValid) {
                $validator->errors()->add('city_id', 'The selected city does not belong to the selected region or is inactive.');
            }
        });
    }
}

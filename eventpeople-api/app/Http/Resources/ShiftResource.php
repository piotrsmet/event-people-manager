<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class ShiftResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event_name' => $this->zone->event->name,
            'zone_name' => $this->zone->name,
            'start_time' => Carbon::parse($this->start_time)->format('Y-m-d H:i'),
            'end_time' => Carbon::parse($this->end_time)->format('Y-m-d H:i'),
            'required_role' => $this->required_role,
            'required_people' => $this->required_people,
        ];
    }
}
